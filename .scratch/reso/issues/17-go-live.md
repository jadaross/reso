# 17 — Put it in front of the group

**What to build:** Reso stops being a repo and becomes a link in a WhatsApp message that eight
people install on their phones.

**Blocked by:** 10, 11, 12, 13, 14, 15, 16

**Status:** ready-for-human

Most of this is Jada's to do — it needs accounts, a dashboard and her own phone. The agent's job is
to make each step a single command or a single click, and to verify the result.

- [ ] The Neon integration is installed on the Vercel project on the free plan, and the injected variables are confirmed present in all three environments
- [ ] `SESSION_SECRET`, the VAPID pair and `CRON_SECRET` are set in Vercel and locally
- [ ] Migrations are applied to the production database
- [ ] The seed has run once, creating the Group, Jada as Admin, her PIN, and the first Group Link
- [ ] The daily cron is registered and has been observed running once, with its authorisation rejecting an unauthenticated call
- [ ] Jada has installed the app on her own iPhone, claimed her name inside the installed app, and received a test push
- [ ] The first Outing exists with the correct tier, Low, and the correct Close Day
- [ ] The Group Link and a short "what this is" message are ready for Jada to send to the group
