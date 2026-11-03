# 30 — No wall on the first visit

**What's wrong:** Picking your name lands on a full-screen "Put Reso on your phone" with a
paragraph, three steps and a boxed aside; the only exit is a small grey "I'll do it later". Every
persona hunted for it, and Jack, who had used the app in October, was re-onboarded. Once dismissed,
the "Notifications and setup" link and the "Put Reso on your Home Screen" card both go to that page,
which bounces straight back: two dead taps on every visit.

**What to build:** Picking a name lands on the ticket. The install nudge is one banner at the top of
Dinner ("Add Reso to your Home Screen · it's how reminders reach you") with a "Show me" button that
opens the three steps as a sheet and a real "Later" button. The banner is gone when the app is
running installed. "Notifications and setup" opens a sheet with notifications on/off and the install
steps, and works whether or not the banner was dismissed.

**Blocked by:** nothing

**Status:** done

- [x] After "Who are you?" the next screen is Dinner, for new and returning Members alike
- [x] The banner is at the top of Dinner in Safari and gone in the installed app (display-mode standalone)
- [x] "Show me" opens the three steps as a sheet; "Later" hides the banner for that Device and nothing else
- [x] The boxed aside about being asked your name twice is reduced to one line inside the sheet
- [x] "Notifications and setup" opens a sheet with: allow notifications (and a "send myself a test"), and the install steps; it never redirects
- [x] A direct visit to the old start URL shows the same sheet content rather than bouncing
