import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { drawnFromLine, openMonthLine, tappedChip, tieRule, voteDoorLine } from "./doors";

describe("the open month strip", () => {
  it("asks for free nights in one line and counts what is already tapped", () => {
    assert.equal(
      openMonthLine({
        month: "2026-12-01",
        tier: "high",
        kind: "restaurant",
        closeDay: "2026-11-22",
      }),
      "December · £££ month · tap your free nights by Sun 22 Nov",
    );
    assert.equal(tappedChip(0), "0 tapped");
    assert.equal(tappedChip(3), "3 tapped");
  });

  it("names a dinner party instead of a price tier", () => {
    assert.equal(
      openMonthLine({
        month: "2026-12-01",
        tier: "low",
        kind: "party",
        closeDay: "2026-11-22",
      }),
      "December · dinner party · tap your free nights by Sun 22 Nov",
    );
  });
});

describe("the month vote door", () => {
  it("puts the month, the count and the count day on one line", () => {
    assert.equal(
      voteDoorLine("2027-01-01", 2, "2026-12-01"),
      "January · 2 votes · counted 1 Dec",
    );
    assert.equal(
      voteDoorLine("2027-01-01", 1, "2026-12-01"),
      "January · 1 vote · counted 1 Dec",
    );
  });

  it("says the rota breaks a tie it is in, and any other tie is drawn", () => {
    assert.equal(tieRule(), "The rota breaks a tie it is in; any other tie is drawn.");
  });
});

describe("the draw line", () => {
  it("names how many tickets were in the hat, and a redraw when there was one", () => {
    assert.equal(drawnFromLine(5, false), "Drawn from 5 tickets");
    assert.equal(drawnFromLine(1, false), "Drawn from 1 ticket");
    assert.equal(drawnFromLine(5, true), "Drawn from 5 tickets, after a redraw");
  });
});
