# 08 — Design foundation and the app shell

**What to build:** Every existing screen stops looking like unstyled HTML and starts looking like
Reso. A Member opening the Group Link sees a dark, app-like surface with their own name always
visible, and can move between the month, the restaurants and the history without going back to a
menu.

This is prefactoring: it delivers no new behaviour, and it makes every ticket after it easy.

**Blocked by:** None — can start immediately.

**Status:** done

Reference: direction A in `app/prototype/look/variant-a.tsx`, decided in ticket 06. Take the
tokens and the type, not the fixture data.

- [x] Tokens (field, card, accent, muted, type scale, radii) are CSS custom properties defined once in `app/globals.css`; no component hardcodes a hex value
- [x] Bricolage Grotesque and Inter Tight are self-hosted via `next/font`, so the installed app renders correctly offline
- [x] A shell under `app/g/[secret]/` renders the header with the Group's current month and the signed-in Member's name, and a bottom bar linking the month, the restaurants and the history
- [x] "Not you?" remains reachable from the header and still calls the existing switch action
- [x] The dark field paints before first content, so the installed app never flashes white on launch
- [x] Contrast of body text on the field meets WCAG AA, verified at the smallest size used
- [x] Keyboard focus is visible on every interactive element
- [x] `pnpm typecheck` and `pnpm lint` are clean

## Done

Verified against a local Postgres seeded with the real roster: Jada, Lottie, Sienna, Scotty, Sophie
and Jack. The name pick, both nav destinations and the switch-name path were exercised in a browser.

Two things were done that the ticket did not ask for, because the ticket could not be verified
without them:

- `lib/db/index.ts` now picks its driver from the URL: Neon's HTTP driver for a Neon host, plain
  node-postgres for localhost. Neon's driver speaks a protocol only Neon serves, so before this
  there was no way to run the app without a cloud database. Ticket 09 needs the same seam.
- `drizzle.config.ts` reads `.env.local` itself, because drizzle-kit runs outside Next and nothing
  had loaded it. `scripts/seed.ts` gained `--members` so the whole roster seeds in one command.

Placeholder panels remain on the month, restaurants and history screens, each naming the ticket
that fills it. They are styled in the real language, so they read as "not built yet" rather than
as broken.
