# 10 — Pick your name

**What to build:** A friend opens the Group Link for the first time, sees the names of the group,
taps their own, and is in. Opening it again on the same phone goes straight past this screen.

**Blocked by:** 08

**Status:** done

The claim and switch server actions already exist and work. This is the screen and its states.

- [x] Unclaimed and claimed names are all listed and all tappable — a name is not exclusive, and Jada's iPad claims the same name as her phone
- [x] Archived Members do not appear
- [x] Tapping a name signs this device in and lands on the month
- [x] "Not you?" returns here and the next tap replaces the identity with no confirmation step
- [x] An empty roster explains that the Admin has to add names, rather than showing a blank list
- [x] The screen is reachable and correct inside the installed Home Screen app, which starts with its own empty cookie jar

## Done

Delivered whole by ticket 08 rather than as separate work: the shell ticket had to render the
pick-your-name screen in order to have anything to frame, and doing it properly cost nothing extra.
Exercised in a browser against the real roster — claiming a name, landing on the month, and
returning via "Not you?" all work.

The one criterion not verified by machine is behaviour inside an installed Home Screen app, which
needs a physical iPhone. It is covered by ticket 17, where Jada installs it on her own phone.
