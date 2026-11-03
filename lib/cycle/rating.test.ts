import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collapsedRatingLine, shownRatings } from "./rating";

describe("a saved rating", () => {
  it("collapses to the place, the stars and the note", () => {
    assert.equal(
      collapsedRatingLine("Tayyabs", 4, "your line").text,
      "Tayyabs ★★★★ · your line",
    );
  });

  it("leaves the note off the line when there isn't one", () => {
    assert.equal(collapsedRatingLine("Tayyabs", 4, null).text, "Tayyabs ★★★★");
    assert.equal(collapsedRatingLine("Tayyabs", 4, "   ").text, "Tayyabs ★★★★");
  });
});

describe("who rated a Visit", () => {
  it("counts a rating with no note as a name with no quote", () => {
    const shown = shownRatings([
      { memberId: "a", who: "Ada", score: 5, note: "the lamb" },
      { memberId: "b", who: "Ben", score: 3, note: null },
      { memberId: "c", who: "Cy", score: 4, note: "  " },
    ]);

    assert.equal(shown.peopleLabel, "3 people");
    assert.equal(shown.lines.length, 3);
    assert.deepEqual(
      shown.lines.map((line) => [line.who, line.quote]),
      [
        ["Ada", "the lamb"],
        ["Ben", null],
        ["Cy", null],
      ],
    );
  });

  it("says person when one Member rated", () => {
    const shown = shownRatings([
      { memberId: "a", who: "Ada", score: 5, note: null },
    ]);

    assert.equal(shown.peopleLabel, "1 person");
    assert.equal(shown.lines.length, 1);
    assert.equal(shown.lines[0]?.who, "Ada");
    assert.equal(shown.lines[0]?.quote, null);
  });
});
