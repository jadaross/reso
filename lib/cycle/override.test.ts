import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shortDate } from "./announcement";
import { computeChosenDate } from "./chosen-date";
import { daysInMonth } from "./dates";
import {
  clearDatePin,
  drawAgainLabel,
  pinLine,
  pinNote,
  resolveChosenDate,
  tapNight,
  tierHeading,
  tierSetNote,
  tierUndo,
} from "./override";

describe("pinning a Chosen Date", () => {
  const december = daysInMonth("2026-12-01");
  // Fri 4 Dec has two people. Sat 12 Dec has three, so the vote leads the 12th.
  const free = [
    { memberId: "jada", day: "2026-12-04" },
    { memberId: "lottie", day: "2026-12-04" },
    { memberId: "jada", day: "2026-12-12" },
    { memberId: "lottie", day: "2026-12-12" },
    { memberId: "sienna", day: "2026-12-12" },
  ];

  it("pins the night that was tapped, then clears it and recomputes when that night is tapped again", () => {
    const leader = computeChosenDate(december, free).chosenDate;
    assert.equal(leader, "2026-12-12");

    const pinned = tapNight(
      { chosenDate: leader, overridden: false },
      "2026-12-04",
      leader,
    );
    assert.deepEqual(pinned, { chosenDate: "2026-12-04", overridden: true });
    // Close Day keeps the pin. The vote still leads the 12th.
    assert.equal(resolveChosenDate(leader, pinned), "2026-12-04");

    const cleared = tapNight(pinned, "2026-12-04", leader);
    assert.deepEqual(cleared, { chosenDate: "2026-12-12", overridden: false });
    assert.equal(resolveChosenDate(leader, cleared), "2026-12-12");
  });

  it("lets the vote decide by clearing the pin and using the recomputed night", () => {
    const leader = computeChosenDate(december, free).chosenDate;
    const pinned = tapNight(
      { chosenDate: null, overridden: false },
      "2026-12-04",
      leader,
    );

    const cleared = clearDatePin(leader);
    assert.deepEqual(cleared, { chosenDate: "2026-12-12", overridden: false });
    assert.equal(resolveChosenDate(leader, cleared), "2026-12-12");
    assert.equal(pinned.overridden, true);
  });

  it("pins the leading night instead of treating an unpinned date as already pinned", () => {
    const next = tapNight(
      { chosenDate: "2026-12-12", overridden: false },
      "2026-12-12",
      "2026-12-12",
    );
    assert.deepEqual(next, { chosenDate: "2026-12-12", overridden: true });
  });
});

describe("override wording", () => {
  it("names the rota or the vote, and the way back", () => {
    assert.equal(tierHeading("rota", "£££"), "Rota says £££ · Override");
    assert.equal(tierHeading("vote", "£"), "Vote said £ · Override");
    assert.equal(tierUndo("rota"), "Back to the rota");
    assert.equal(tierUndo("vote"), "Back to the vote");
  });

  it("names the month when a tier or a night is set", () => {
    assert.equal(tierSetNote("December", "£££"), "December is now £££");
    assert.equal(shortDate("2026-12-04"), "Fri 4 Dec");
    assert.equal(pinNote("December", "Fri 4 Dec"), "December pinned to Fri 4 Dec");
    assert.equal(pinLine("Jada", "Fri 4 Dec"), "Jada pinned Fri 4 Dec");
  });

  it("warns that a booked table has to be cancelled before drawing again", () => {
    assert.equal(
      drawAgainLabel("Smoking Goat"),
      "Draw again (the table is booked for Smoking Goat; you'll need to cancel it)",
    );
  });
});
