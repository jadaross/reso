# Scheduled reminders for a small friend-group app (Next.js on Vercel) — research, Sept 2026

## TL;DR
- **You cannot post into an existing consumer WhatsApp group from a server through any legitimate API.** Meta's Groups API only lets a business create *its own* groups (max 8 participants, Official Business Account required). Unofficial libraries work but violate WhatsApp ToS and risk a ban.
- **Cheapest legit "lands in a group chat" options:** Telegram bot (free, ~30 min) or Discord webhook (free, ~10 min). Both require the group to move platform.
- **Keep WhatsApp without an API:** a copy-paste / `navigator.share()` flow where the organiser taps a button and forwards the pre-written message to the group. Zero cost, zero approval, one human tap.
- **Scheduling on Vercel:** Hobby crons run at most once/day with ±59 min precision; Pro is per-minute. Vercel Workflows' `sleep('N days')` (no max) is an alternative for "send on day X".

## 1. WhatsApp
**Cloud API + groups.** Meta added a Groups API to the Cloud API. Key facts from the docs: "open to all businesses with an Official Business Account (OBA)"; "Max group participants: 8"; groups are "an invite-only experience where participants join using a group invite link you send them" (the invite link itself must be sent via an approved template). There is no endpoint to join or post to a pre-existing consumer group. Not available to WhatsApp Business *app* numbers. So this is unusable for a 6–15 person existing group even if you had an OBA (OBA is the green-tick tier, which requires business verification and a "notable" brand — not realistic for a hobby project).

**Cloud API requirements generally:** Meta Business Portfolio; a phone number *not already registered on WhatsApp* (you'd need a spare number); new portfolios start at 250 unique recipients/24h and need business verification (or 2,000 quality template deliveries) to scale; anything you send outside the 24h customer-service window must be an **approved template**. Twilio's docs say the same: complete Meta business verification before production, number cannot already be on WhatsApp.

**Cost:** per-message pricing since 1 July 2025; utility/marketing templates charged per delivered message by recipient country (US utility ≈ $0.004; UK/AU higher; rate cards are CSVs on Meta's site). Non-template messages inside an open 24h window are free. Even at 15 people × 2 messages/month the cost is trivial; the *setup* is the barrier, not the price.

**Twilio WhatsApp sandbox:** testing only. Each user must send `join <code>` to +1 415 523 8886; "the Sandbox session expires three days after joining"; only Twilio's three pre-approved templates outside the 24h window; one message every 3 seconds. Not viable for reminders.

**Unofficial libraries (whatsapp-web.js, Baileys):** drive WhatsApp Web via Puppeteer from a logged-in phone session, and *can* post to groups. The README itself warns: "WhatsApp does not allow bots or unofficial clients on their platform... it is not guaranteed you will not be blocked." Also needs a long-running process (not serverless-friendly on Vercel) and ties the organiser's real number to the risk of a ban. Not recommended.

**Click-to-chat:** `https://wa.me/<number>?text=<urlencoded>` prefills a message to a *single* number. Group invite links (`chat.whatsapp.com/...`) accept no `text` parameter, so there is no deep link that prefills a message into a group. See §9 for the share-sheet workaround.

## 2. iMessage
No public API; Apple offers no server-side send. "Messages for Business" is a business-chat product (grey-bubble, requires a Messaging Service Provider), not a way to post into a friends' iMessage group. Hacks: a Mac left on 24/7 running a Shortcuts automation or AppleScript (`tell application "Messages" to send ...`) from the owner's Apple ID; macOS 15 Messages can also "Send Later" up to 14 days ahead. Third parties (Sendblue, etc.) do this on Mac farms for a fee. All of it is fragile and personal-account-bound. Answer: effectively no.

## 3. Telegram bot
Free, no approval. Create a bot with @BotFather (get a token), a member adds the bot to the group, read the group's `chat_id` from an update (or `getUpdates`), then `POST https://api.telegram.org/bot<TOKEN>/sendMessage` with `{chat_id, text}`. Limits: ≤20 messages/min per group, ~30 msg/s overall. Works fine from a Vercel function. Effort ~30 min. Downside: the group has to be on Telegram.

## 4. Discord webhook
Free. Server settings → Integrations → Webhooks → copy URL; `POST /webhooks/{id}/{token}` with `{"content": "..."}` (≤2000 chars, embeds optional). "Webhooks do not require a bot user or authentication to use." Effort ~10 min. Same caveat: group must live in Discord.

## 5. Email (Vercel Marketplace)
Resend is a native Marketplace integration (also Knock, Novu). Resend free tier: **3,000 emails/month, hard cap 100/day**, 1 verified domain (pricing page currently lists 3 domains on free; account-quota doc says 1 — check on signup), 30-day log retention, no card. Pro is $20/mo for 50k. 15 recipients × a few sends/month is nowhere near the limit. Reliable, but email is the channel your friends read last.

## 6. Web Push from a PWA
iOS 16.4+ supports standards Web Push (VAPID) **only for web apps added to the Home Screen**; permission must be requested from a user gesture; delivered via APNs. iOS 26 makes any Home-Screen site open as a web app. Safari 18.4 added Declarative Web Push. Practical issues: every friend must install the PWA and tap "allow"; subscriptions silently die when the app is deleted; Android/desktop Chrome work with no install step. Effort: service worker + `web-push` npm + store subscriptions in a DB + cron to fan out — a day or so. Good as a *secondary* channel, poor as the only one for a casual group.

## 7. SMS (Twilio list prices, USD, outbound per segment)
- US: from $0.0083 + carrier fees; long code $1.15/mo; A2P 10DLC registration required (fees + campaign vetting).
- UK: $0.056; UK mobile number $2.50/mo.
- AU: $0.0515; AU mobile number $8.25/mo; alphanumeric sender ID free (one-way).
At 15 people × 2 msgs/month ≈ 30 msgs ≈ $0.25–$1.70/month plus number rental. Reliable and universal, but the highest ongoing cost and US compliance paperwork.

## 8. Scheduling on Vercel
- **Cron Jobs** (all plans, 100 per project): Hobby = minimum once per day, precision ±59 min (a `0 9 * * *` job fires between 09:00 and 09:59; more frequent expressions fail deploy). Pro/Enterprise = per-minute, per-minute precision. Billed as normal function invocations. Pattern for "send on day X": one daily cron that queries the DB for reminders due today.
- **Vercel Workflows** (GA, Hobby includes 50k events + 1 GB written/month): `'use workflow'` + `await sleep('7 days')` — "Maximum sleep duration: No limit", survives deploys. Lets you start a run when a dinner is created and sleep until the reminder date; precise timing without Pro. Slight complexity overhead.
- **Vercel Queues** (public beta since Feb 2026): "Delay before visible" max 7 days, TTL max 7 days — too short for month-ahead reminders. Not needed here.

## 9. Copy-paste / share fallback (works with WhatsApp today)
1. Cron/Workflow emails or pushes **the organiser only** ("Reminder to send: ...") with the composed text and a deep link into the app.
2. The app page renders the message with a **Copy** button and a **Share** button using `navigator.share({ text })` (Safari iOS, Chrome Android; needs HTTPS + user gesture). On iOS the share sheet lists WhatsApp; the user picks the group and taps send. Two taps, no API, no ToS risk.
3. Optionally add `wa.me/?text=...` (no number) which opens WhatsApp's contact picker with the text prefilled — the user then selects the group.
This keeps the group on WhatsApp and costs nothing; the trade-off is one human in the loop.

## Recommendation
Default to **daily Hobby cron + organiser nudge (email via Resend or Web Push) + copy/share button** for WhatsApp. If the group will tolerate a platform move, a **Telegram bot** gives true zero-touch delivery for free. Revisit SMS only if reliability matters more than cost.

## Sources
- Meta Groups API: https://developers.facebook.com/documentation/business-messaging/whatsapp/groups and /groups/get-started
- Meta pricing: https://developers.facebook.com/docs/whatsapp/pricing
- Meta messaging limits: https://developers.facebook.com/docs/whatsapp/messaging-limits
- Twilio WhatsApp sandbox: https://www.twilio.com/docs/whatsapp/sandbox
- Twilio WhatsApp self sign-up: https://www.twilio.com/docs/whatsapp/self-sign-up
- whatsapp-web.js README: https://github.com/pedroslopez/whatsapp-web.js
- WhatsApp click to chat: https://faq.whatsapp.com/5913398998672934
- Apple Messages "Send Later": https://support.apple.com/guide/messages/schedule-messages-icht113734b8/mac
- Telegram Bot API / FAQ / features: https://core.telegram.org/bots/api, https://core.telegram.org/bots/faq, https://core.telegram.org/bots/features
- Discord webhooks: https://docs.discord.com/developers/resources/webhook
- Resend pricing / quotas: https://resend.com/pricing, https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Vercel Marketplace (messaging): https://vercel.com/marketplace?category=messaging
- WebKit Web Push on iOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- MDN navigator.share: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- Twilio SMS pricing: https://www.twilio.com/en-us/sms/pricing/us, /gb, /au
- Vercel cron limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
- Vercel Workflows: https://vercel.com/docs/workflows, /docs/workflows/concepts, /docs/workflows/pricing
- Vercel Queues: https://vercel.com/docs/queues/pricing, https://vercel.com/changelog/vercel-queues-now-in-public-beta
