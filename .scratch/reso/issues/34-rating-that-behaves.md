# 34 — Rating that behaves

**What's wrong:** Pressing return in the note box loses the note while still showing "Saved."
"Saved." then stays on screen forever, including on a fresh load with an empty box. The rating
card on Dinner asks "How was Tayyabs?" of Members who were not there, and after saving it stays as
four lines (heading, stars, box, Saved) instead of collapsing.

**What to build:** Return saves the note. "Saved." appears for a moment and fades. Once saved, the
card collapses to one line, "Tayyabs ★★★★ · your line", and expands on tap to edit. Only Members
recorded as attending are asked, on Dinner and Past alike; everyone can still read the scores and
notes.

**Blocked by:** nothing

**Status:** done

- [x] Return in the note box saves it, the same as tapping Save
- [x] "Saved." fades within a couple of seconds and does not show on load
- [x] After a rating is saved the card is one line with the stars and the note; tapping it reopens the editor
- [x] A Member not in the Visit's attendance sees no stars to tap, on Dinner or Past, and still sees the average, the names and the notes
- [x] The Past list shows "N people" matching the number of names shown, counting a rating with no note as a name with no quote
