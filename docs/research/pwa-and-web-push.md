# Installable web app and Web Push on iPhone from Next.js

Facts as of 2026-09-06 (iOS 26 current). Builds on `reminder-channels.md` §6; the "iOS 16.4+, Home Screen only" baseline is not repeated here.

## TL;DR

- iOS honours a small set of things: `display: standalone|fullscreen` in the manifest, `apple-touch-icon`, the `apple-mobile-web-app-*` meta tags, `theme-color`, and `viewport-fit=cover`. On iOS 26 every Home Screen addition opens as a web app whether or not a manifest exists [S5][S6].
- **The installed app starts with an empty cookie jar.** Apple: Home Screen apps are "isolated entities without shared state with the browser" [S11]; WebKit: their "website data … is kept isolated from Safari" [S10]. Only macOS copies cookies on Add to Dock [S12]. The name-cookie set in Safari will not exist in the installed app, so the name pick must happen (again) inside the app, and the launch URL must carry the group secret.
- Web Push: standard VAPID + `web-push`, no Apple developer account [S2]. Subscribe must be called directly inside the tap handler [S2][S3], and only from the installed app [S1]. Every push must show a notification or Safari revokes the permission [S2][S3].
- Vercel Hobby cron: once per day, fired anywhere within the scheduled hour [S22]. One daily route that decides what (if anything) to send is enough.

## (a) Installable web app on iOS

**Manifest.** `app/manifest.ts` is a Next.js file convention (served at `/manifest.webmanifest`) [S14]. iOS reads `display` (`standalone` or `fullscreen` gives app behaviour) [S1][S12]; Chromium additionally needs `name`/`short_name`, `start_url`, and 192px + 512px icons to offer install [S20]. Manifests are no longer *required* on iOS 26, but they still work [S5].

**`start_url` and the secret link.** If `start_url` is omitted (or not same-origin), "the URL of the page that links to the manifest is used" [S25]. Because the installed app has no cookies, put the group secret in the path (e.g. `/g/<secret>`) and omit `start_url`, so the app launches on the secret page and the Member picks their name there; the cookie is then set in the app's own jar. (A dynamic per-user `start_url` via `cookies()` in `manifest.ts` is theoretically possible [S14] but manifest-fetch credentials on iOS are unverified; don't rely on it.)

**Icon.** `app/apple-icon.png` emits `<link rel="apple-touch-icon">` [S15]; Apple's recommended iPhone size is 180×180, and the nearest larger icon is used if no exact match [S7]. Manifest `icons` serve Chromium [S20].

**Meta tags.** `metadata.appleWebApp = { title, statusBarStyle }` emits `mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, and optional `apple-touch-startup-image` links [S16]. Status bar values: `default`, `black`, `black-translucent`; with the last, content is drawn under the status bar [S8]. Use `default` unless you handle safe areas.

**Viewport.** Export `viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor }` [S17]. `viewport-fit=cover` lays the page out to the full screen; pad with `env(safe-area-inset-*)` [S9].

**Splash.** iOS shows "a screenshot of the web application the last time it was launched" unless you supply `apple-touch-startup-image` [S7]. Skip startup images; the screenshot behaviour is fine for a tiny app.

**Storage quirks.** Isolation cuts both ways: Home Screen apps are exempt from ITP's 7-day script-writable-storage cap [S10], so once the name cookie is set inside the app it is durable. `window.matchMedia('(display-mode: standalone)')` [S13] or `navigator.standalone` [S8] tells you whether you're inside the installed app; show "Add to Home Screen" instructions otherwise (no `beforeinstallprompt` on iOS [S13][S20]).

## (b) Web Push

**Keys and env.** `npx web-push generate-vapid-keys` once; store as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` [S13][S21], plus `VAPID_SUBJECT` (`mailto:` or `https:` URI) for `setVapidDetails` [S21]. No Apple Developer Program needed [S2].

**Service worker.** No library needed: a static `public/sw.js` is served at `/sw.js` [S18]; register with `navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })` and add `Cache-Control: no-cache` headers for `/sw.js` in `next.config` [S13]. The worker handles `push` (must call `showNotification`) and `notificationclick` [S13][S19]. Serwist is a build-time precaching integration (`withSerwist`, `swSrc`/`swDest`, separate Turbopack guide) [S24]; only worth it if you want offline caching, which Reso doesn't.

**Subscribe flow (iOS rules).** Only in the installed app [S1]. "Call the push subscription method immediately from the gesture's event handler code" [S2]; a subscription request "requires an explicit user gesture" [S3]. So: a "Notify me" button, shown only in standalone mode, whose handler calls `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` and posts the result to the server [S13]. The subscription has `endpoint`, `keys.p256dh`, `keys.auth`, `expirationTime`; the endpoint must be kept secret [S19].

**Storage.** Table `push_subscriptions(endpoint PK, member_id, p256dh, auth, created_at)`, upserted by endpoint. The Next.js guide's in-memory example is explicitly a placeholder for a DB [S13].

**Sending.** `webpush.sendNotification(sub, JSON.stringify({ title, body, url }), { TTL, urgency, topic })` from a route handler [S21]. Apple: payload ≤ 4 KB, TTL required, `topic` ≤ 32 chars, urgency `very-low|low|normal|high`; APNs stores undelivered messages up to 30 days [S2]. Endpoints are under `*.push.apple.com` [S2][S3]. Silent pushes revoke permission [S2][S3] — every push must produce a notification.

**Deletion / inactivity.** Apple does not document what happens on app deletion; it documents HTTP 410 ("device token has expired") on send [S2], and `web-push` reports 404/410 as "subscription no longer valid" [S21]. Delete rows on 404/410. Handle `pushsubscriptionchange` in the worker to re-post a renewed subscription [S19]. Expect churn: a Member who deletes and reinstalls must tap "Notify me" again.

**Declarative Web Push (iOS 18.4+).** Payload `{ "web_push": 8030, "notification": { "title", "body", "navigate", "app_badge" } }`; `window.pushManager` lets you subscribe without a service worker, and a root-scoped worker shares the same subscription [S4]. It is a good *payload shape* to send even with a worker (Safari shows it if the worker fails), but Android Chrome does not understand it, so keep the worker and treat declarative JSON as an extra.

## (c) Android Chrome / desktop

Push API is Baseline since March 2023 [S19]; Chrome/Edge/Firefox on Android and Chromium desktop install via the address bar or `beforeinstallprompt`, with the 192/512 icon and `display` requirements above [S20]. No install step is needed for push there [S13]. Same `web-push` code covers all of them.

## Recommended minimal shape

```
app/manifest.ts            name, short_name, display:'standalone', icons 192/512, theme/background; no start_url
app/apple-icon.png         180×180
app/layout.tsx             metadata.appleWebApp{title,statusBarStyle:'default'}; viewport{viewportFit:'cover',themeColor}
app/g/[secret]/page.tsx    entry + name pick (sets cookie) — this is what the installed app launches
public/sw.js               push -> showNotification; notificationclick -> clients.openWindow(data.url)
components/notify-toggle.tsx  standalone-only button; subscribe inside the tap handler; POST to action
app/actions/push.ts        saveSubscription / removeSubscription (upsert by endpoint)
lib/push.ts                web-push setup; sendToMembers(); prune on 404/410
app/api/cron/route.ts      GET; check `Authorization: Bearer ${CRON_SECRET}`; pick today's reminder; idempotent via sent_log
vercel.json                { "crons": [{ "path": "/api/cron", "schedule": "0 9 * * *" }] }
next.config.ts             headers for /sw.js (Content-Type, Cache-Control no-cache)
```

Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, DB URL. Hobby cron fires between 09:00 and 09:59 [S22]; Vercel does not retry and may double-invoke, so the route must be idempotent (record what it sent per Outing/day) [S23]. The Close Day reminders ("tap your dates" on e.g. the 8th, "last call" on the 14th, announcement on the 15th) fit a single daily route.

## Sources

- [S1] WebKit, "Web Push for Web Apps on iOS and iPadOS" — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [S2] Apple, "Sending web push notifications in web apps and browsers" — https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- [S3] WebKit, "Meet Web Push for Safari" — https://webkit.org/blog/12945/meet-web-push/
- [S4] WebKit, "Meet Declarative Web Push" — https://webkit.org/blog/16535/meet-declarative-web-push/
- [S5] WebKit, "WebKit Features in Safari 26.0" — https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- [S6] WebKit, "News from WWDC25: WebKit in Safari 26 beta" — https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- [S7] Apple, "Configuring Web Applications" — https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html
- [S8] Apple, "Supported Meta Tags" — https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariHTMLRef/Articles/MetaTags.html
- [S9] WebKit, "Designing Websites for iPhone X" — https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- [S10] WebKit, "Tracking Prevention in WebKit" — https://webkit.org/tracking-prevention/
- [S11] WebKit bug 181849 (Apple comment, 2022-02-01) — https://bugs.webkit.org/show_bug.cgi?id=181849
- [S12] WebKit, "News from WWDC23: WebKit Features in Safari 17 beta" — https://webkit.org/blog/14205/news-from-wwdc23-webkit-features-in-safari-17-beta/
- [S13] Next.js, "How to build a PWA with Next.js" — https://nextjs.org/docs/app/guides/progressive-web-apps
- [S14] Next.js, `manifest.json` file convention — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- [S15] Next.js, `favicon`, `icon`, `apple-icon` — https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons
- [S16] Next.js, `generateMetadata` (`appleWebApp`) — https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- [S17] Next.js, `generateViewport` — https://nextjs.org/docs/app/api-reference/functions/generate-viewport
- [S18] Next.js, `public` folder — https://nextjs.org/docs/app/api-reference/file-conventions/public-folder
- [S19] MDN, Push API — https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- [S20] MDN, "Making PWAs installable" — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- [S21] `web-push` README — https://github.com/web-push-libs/web-push
- [S22] Vercel, "Usage & Pricing for Cron Jobs" — https://vercel.com/docs/cron-jobs/usage-and-pricing
- [S23] Vercel, "Managing Cron Jobs" — https://vercel.com/docs/cron-jobs/manage-cron-jobs
- [S24] Serwist, Next.js getting started — https://serwist.pages.dev/docs/next/getting-started
- [S25] MDN, manifest `start_url` — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/start_url
