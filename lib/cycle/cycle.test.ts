import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { announcementText } from "./announcement";
import { computeChosenDate } from "./chosen-date";
import {
  addMonths,
  calendarGrid,
  closeDayFor,
  daysInMonth,
  monthOf,
  openDayFor,
  todayInLondon,
  weekdayOf,
} from "./dates";
import { drawFrom, randomIndex } from "./draw";
import { copyFor } from "./messages";
import { tierForMonth, tierForSequence } from "./tier";

describe("dates", () => {
  it("reads today in London, not UTC", () => {
    // 23:30 UTC in June is already tomorrow in London, which is on BST.
    assert.equal(todayInLondon(new Date("2026-06-15T23:30:00Z")), "2026-06-16");
    // The same clock time in January is not, because London is on GMT.
    assert.equal(todayInLondon(new Date("2026-01-15T23:30:00Z")), "2026-01-15");
  });

  it("walks months across a year boundary", () => {
    assert.equal(addMonths("2026-01-01", -1), "2025-12-01");
    assert.equal(addMonths("2026-12-01", 1), "2027-01-01");
    assert.equal(addMonths("2026-06-01", -18), "2024-12-01");
  });

  it("knows how long a month is, including a leap February", () => {
    assert.equal(daysInMonth("2026-02-01").length, 28);
    assert.equal(daysInMonth("2028-02-01").length, 29);
    assert.equal(daysInMonth("2026-04-01").length, 30);
    assert.deepEqual(daysInMonth("2026-04-01").at(-1), "2026-04-30");
  });

  it("derives the month, open day and Close Day of an Outing", () => {
    assert.equal(monthOf("2026-03-19"), "2026-03-01");
    assert.equal(openDayFor("2026-03-01"), "2026-02-01");
    assert.equal(closeDayFor("2026-03-01"), "2026-02-15");
    // The month before January is in the previous year.
    assert.equal(closeDayFor("2026-01-01"), "2025-12-15");
  });

  it("gets weekdays right", () => {
    assert.equal(weekdayOf("2026-09-04"), 5); // Friday
    assert.equal(weekdayOf("2026-09-05"), 6); // Saturday
    assert.equal(weekdayOf("2026-09-07"), 1); // Monday
  });
});

describe("tier rotation", () => {
  it("starts at Low and repeats", () => {
    assert.equal(tierForSequence(0), "low");
    assert.equal(tierForSequence(1), "medium");
    assert.equal(tierForSequence(2), "high");
    assert.equal(tierForSequence(3), "low");
  });

  it("counts months from the first Outing, so a skipped month cannot shift it", () => {
    const first = "2026-01-01";
    assert.equal(tierForMonth("2026-01-01", first), "low");
    assert.equal(tierForMonth("2026-02-01", first), "medium");
    assert.equal(tierForMonth("2026-03-01", first), "high");
    assert.equal(tierForMonth("2026-04-01", first), "low");
    // March is still High whether or not February ever happened.
    assert.equal(tierForMonth("2027-01-01", first), "low");
  });

  it("handles a month before the first Outing", () => {
    assert.equal(tierForMonth("2025-12-01", "2026-01-01"), "high");
  });
});

describe("chosen date", () => {
  const march = daysInMonth("2026-03-01");

  it("picks the day the most Members can make", () => {
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-03-02" },
      { memberId: "b", day: "2026-03-02" },
      { memberId: "c", day: "2026-03-02" },
      { memberId: "a", day: "2026-03-03" },
    ]);
    assert.equal(result.chosenDate, "2026-03-02");
    assert.equal(result.count, 3);
    assert.equal(result.quorumMet, true);
  });

  it("breaks a tie toward Friday or Saturday over a weekday", () => {
    // 2026-03-02 is a Monday; 2026-03-06 is a Friday. Both have two Members.
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-03-02" },
      { memberId: "b", day: "2026-03-02" },
      { memberId: "a", day: "2026-03-06" },
      { memberId: "b", day: "2026-03-06" },
    ]);
    assert.equal(result.chosenDate, "2026-03-06");
  });

  it("breaks a tie between two weekend days toward the earlier one", () => {
    // 2026-03-06 Friday, 2026-03-07 Saturday.
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-03-06" },
      { memberId: "b", day: "2026-03-06" },
      { memberId: "a", day: "2026-03-07" },
      { memberId: "b", day: "2026-03-07" },
    ]);
    assert.equal(result.chosenDate, "2026-03-06");
  });

  it("flags a failed quorum without cancelling, and offers the top three days", () => {
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-03-02" },
      { memberId: "b", day: "2026-03-02" },
      { memberId: "a", day: "2026-03-04" },
      { memberId: "a", day: "2026-03-05" },
      { memberId: "a", day: "2026-03-09" },
    ]);
    assert.equal(result.quorumMet, false);
    assert.equal(result.chosenDate, "2026-03-02");
    assert.equal(result.topDays.length, 3);
  });

  it("returns nothing when nobody has tapped a day", () => {
    const result = computeChosenDate(march, []);
    assert.equal(result.chosenDate, null);
    assert.equal(result.count, 0);
    assert.equal(result.quorumMet, false);
  });

  it("ignores days outside the Outing's month", () => {
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-04-02" },
      { memberId: "b", day: "2026-03-02" },
    ]);
    assert.equal(result.chosenDate, "2026-03-02");
    assert.equal(result.count, 1);
  });

  it("counts a Member once per day however many rows they have", () => {
    const result = computeChosenDate(march, [
      { memberId: "a", day: "2026-03-02" },
      { memberId: "a", day: "2026-03-02" },
    ]);
    assert.equal(result.count, 1);
  });
});

describe("the draw", () => {
  it("returns nothing when the tier has no Picks", () => {
    assert.equal(drawFrom([]), null);
  });

  it("returns the only candidate when there is one", () => {
    assert.equal(drawFrom(["solo"]), "solo");
  });

  it("stays in bounds", () => {
    for (let bound = 1; bound <= 12; bound++) {
      for (let attempt = 0; attempt < 200; attempt++) {
        const index = randomIndex(bound);
        assert.ok(Number.isInteger(index) && index >= 0 && index < bound);
      }
    }
  });

  it("gives a duplicated Pick roughly twice the chance of a single one", () => {
    // Two Members both added Dishoom, one added Kiln. Dishoom is two tickets.
    const tickets = ["dishoom", "dishoom", "kiln"];
    const counts: Record<string, number> = { dishoom: 0, kiln: 0 };
    for (let i = 0; i < 30_000; i++) counts[drawFrom(tickets)!] += 1;

    const ratio = counts.dishoom / counts.kiln;
    assert.ok(
      ratio > 1.8 && ratio < 2.2,
      `expected roughly 2:1, got ${ratio.toFixed(3)}`,
    );
  });
});

describe("the calendar grid", () => {
  it("starts the week on Monday, so the weekend stays together", () => {
    // 1 October 2026 is a Thursday, so Monday, Tuesday and Wednesday lead as blanks.
    const cells = calendarGrid("2026-10-01");
    assert.deepEqual(cells.slice(0, 4), [null, null, null, "2026-10-01"]);
  });

  it("pads to whole weeks so the columns line up", () => {
    for (const month of ["2026-01-01", "2026-02-01", "2026-10-01", "2027-02-01"]) {
      assert.equal(calendarGrid(month).length % 7, 0);
    }
  });

  it("holds every day of the month exactly once", () => {
    const cells = calendarGrid("2026-10-01");
    assert.deepEqual(
      cells.filter((cell): cell is string => cell !== null),
      daysInMonth("2026-10-01"),
    );
  });

  it("handles a February that starts on a Monday with no padding at the front", () => {
    // 1 February 2027 is a Monday.
    assert.equal(calendarGrid("2027-02-01")[0], "2027-02-01");
  });
});

describe("the announcement", () => {
  const base = {
    month: "2026-10-01",
    chosenDate: "2026-10-16",
    place: "Mangal 2",
    area: "Dalston",
    tier: "low" as const,
    going: 6,
    plusOnes: 0,
    tickets: 2,
  };

  it("names the place, the day and the headcount", () => {
    assert.equal(
      announcementText(base),
      "October: Mangal 2, Dalston — Friday 16 October. 6 of us. Still needs booking.",
    );
  });

  it("counts guests into the headcount and says so", () => {
    assert.match(announcementText({ ...base, plusOnes: 2 }), /8 of us, including 2 guests/);
  });

  it("says a single guest in the singular", () => {
    assert.match(announcementText({ ...base, plusOnes: 1 }), /7 of us, including 1 guest/);
  });

  it("explains an empty tier rather than naming no restaurant", () => {
    const text = announcementText({ ...base, place: null, area: null });
    assert.match(text, /nothing in the low list to draw from/);
    assert.doesNotMatch(text, /null/);
  });

  it("says plainly when nobody gave any dates", () => {
    assert.match(
      announcementText({ ...base, chosenDate: null }),
      /nobody put any dates in/,
    );
  });
});

describe("message wording", () => {
  const facts = {
    month: "2026-10-01",
    place: "Mangal 2",
    answered: 4,
    total: 6,
    announcement: "October: Mangal 2 — Friday 16 October. 6 of us. Still needs booking.",
    inTier: 1,
    tierLabel: "cheap",
  };

  it("tells the group a month has opened, without saying how", () => {
    const copy = copyFor("opened", facts);
    assert.equal(copy.title, "October is open");
    assert.match(copy.body, /Tap the evenings/);
  });

  it("nudges the silent with the count of who is already in", () => {
    assert.match(copyFor("last-call", facts).body, /4 of 6 are in/);
  });

  it("uses the one announcement text for the announcement and the day before", () => {
    assert.equal(copyFor("announced", facts).body, facts.announcement);
    assert.equal(copyFor("day-before", facts).body, facts.announcement);
  });

  it("names the place when asking for a rating", () => {
    assert.match(copyFor("rate", facts).title, /How was Mangal 2\?/);
  });

  it("asks for places without depending on how many there already are", () => {
    for (const inTier of [0, 1, 9]) {
      const copy = copyFor("stock-up", { ...facts, inTier });
      assert.equal(copy.title, "Add some places");
      assert.match(copy.body, /October is a cheap month/);
    }
  });

  it("warns before the month closes without nagging about dates twice", () => {
    assert.match(copyFor("closing-soon", facts).title, /closes in two days/);
  });

  it("does not print null when nothing was drawn", () => {
    for (const kind of ["day-before", "rate"] as const) {
      const copy = copyFor(kind, { ...facts, place: null });
      assert.doesNotMatch(`${copy.title} ${copy.body}`, /null|undefined/);
    }
  });
});
