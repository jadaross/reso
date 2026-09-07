# 09 — Integration test harness for the daily cron

**What to build:** A way to run the whole daily job against a real Postgres and assert on what it
changed, so that the cycle and the messages can be built test-first rather than tested by waiting a
month.

Prefactoring. No behaviour changes.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

The seam is the cron route itself, chosen in the spec: one HTTP call drives opening, closing,
drawing and messaging, and that is where a double-firing cron or a message to the wrong people
would show up.

- [ ] `pnpm test:integration` creates a Neon branch, migrates it, runs the tests, and drops the branch even when they fail
- [ ] A seeding helper builds a Group with Members, Picks and Availability from a plain object, so a test reads as a scenario rather than as SQL
- [ ] Push sending is stubbed at the module boundary and records what would have been sent to whom
- [ ] A first test proves the cron is idempotent: calling it twice on the same day changes nothing the second time
- [ ] A second test proves an Outing closes on its Close Day with the right Chosen Date and a Drawn Pick from the right tier
- [ ] The command is documented in the README next to the others, and noted as not running in CI
