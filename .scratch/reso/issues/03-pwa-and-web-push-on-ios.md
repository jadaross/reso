# Installable web app and push notifications on iPhone from Next.js

Type: research
Status: resolved
Blocked by: —

## Question

Every Member will add Reso to their iPhone home screen, and the site should push "tap your dates", "last call", and the announcement to those who allow it. What exactly does a Next.js App Router app on Vercel need for (a) a proper installable web app on iOS (manifest fields, icons, `display: standalone`, status bar, splash, any iOS quirks as of iOS 26), and (b) Web Push to installed iOS web apps: VAPID keys, service worker registration in Next.js (native support vs a library like Serwist), the `web-push` npm flow, permission UX rules on iOS (must be a user gesture, only after install), subscription storage, what happens when the app is deleted, and Declarative Web Push. Include the Android/desktop story briefly. Recommend a minimal implementation shape.

Findings go in `docs/research/pwa-and-web-push.md`.

## Answer

- iOS honours `display: standalone`, `apple-touch-icon` (180×180), the `apple-mobile-web-app-*` meta tags, `theme-color` and `viewport-fit=cover`; on iOS 26 every Home Screen addition opens as a web app even without a manifest. Next.js covers all of it with `app/manifest.ts`, `app/apple-icon.png`, `metadata.appleWebApp`, and the `viewport` export.
- The installed app starts with an empty cookie jar (Apple: Home Screen apps are isolated from Safari; only macOS copies cookies). So the name pick must happen inside the installed app: put the group secret in the path (`/g/<secret>`) and omit `start_url`, which makes iOS launch the app at the page it was added from.
- Web Push is plain VAPID + `web-push`, no Apple account; a static `public/sw.js` suffices (Serwist only matters for offline caching). Subscribe must be called inside the tap handler, only from the installed app, and every push must show a notification or Safari revokes permission.
- Store subscriptions by endpoint per Member; delete on 404/410 (Apple documents 410 for expired tokens; deletion behaviour itself is undocumented). Declarative Web Push (iOS 18.4+) is a nice payload shape but Android needs the worker, so keep both.
- One daily Hobby cron (`0 9 * * *`, fires within the hour, no retries, may double-fire) hitting an idempotent `/api/cron` route covers "tap your dates", "last call" and the announcement.

Findings: docs/research/pwa-and-web-push.md
