import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { after, describe, it } from "node:test";

import { eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { availability, members, outings, plusOnes } from "@/lib/db/schema";

import { loadYear, saveYear } from "./advance";
import { goingMarkFor, settledFoldLine } from "./announcement";
import { goingMembers } from "./attendance";
import { memberOnDate } from "./booking";
import { currentHeadcount, setAttendance, setMemberGoing } from "./going";

// drizzle-kit's convention: tests run outside Next, which is what loads .env.local.
for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    process.env[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
}

const TODAY = "2026-11-03";
const MONTH = "2027-08-01";
const CHOSEN = "2027-08-14";
const OTHER = "2027-08-02";
const PLACE = "Smoking Goat";

function fold(days: readonly string[]): string {
  return settledFoldLine({
    month: MONTH,
    chosenDate: CHOSEN,
    place: PLACE,
    going: goingMarkFor(days, CHOSEN, "announced"),
  });
}

describe("Dinner and the Dates fold share Availability", () => {
  const db = getDb();
  let outingId = "";
  let adaId = "";
  let boId = "";

  after(async () => {
    if (outingId) await db.delete(outings).where(eq(outings.id, outingId));
    const ids = [adaId, boId].filter(Boolean);
    if (ids.length > 0) await db.delete(members).where(inArray(members.id, ids));
  });

  it("follows Going and Can't both ways, and ignores a bare attendance row", async () => {
    const [outing] = await db
      .insert(outings)
      .values({ month: MONTH, tier: "low", status: "announced", chosenDate: CHOSEN })
      .returning();
    outingId = outing.id;

    const [ada] = await db.insert(members).values({ name: "Sync Ada" }).returning();
    const [bo] = await db.insert(members).values({ name: "Sync Bo" }).returning();
    adaId = ada.id;
    boId = bo.id;

    // Ada has answered the month, but not the night. Bo is free on the night.
    await db.insert(availability).values([
      { outingId: outing.id, memberId: ada.id, day: OTHER },
      { outingId: outing.id, memberId: bo.id, day: CHOSEN },
    ]);

    const read = async () => {
      const year = await loadYear(ada.id, TODAY);
      const days = year.find((month) => month.month === MONTH)?.days ?? [];
      const going = (await goingMembers(outing)).map((member) => member.name);
      return {
        days,
        going,
        answer: memberOnDate(days, CHOSEN),
        heads: await currentHeadcount(outing),
        line: fold(days),
      };
    };

    assert.deepEqual(await read(), {
      days: [OTHER],
      going: ["Sync Bo"],
      answer: "cant",
      heads: 1,
      line: "August · Sat 14 · Smoking Goat · Can’t",
    });

    // Dinner: Going. The Chosen Date joins the other night she already marked.
    await setMemberGoing(outing, ada.id, true);
    await db.insert(plusOnes).values({ outingId: outing.id, memberId: ada.id });
    assert.deepEqual(await read(), {
      days: [OTHER, CHOSEN],
      going: ["Sync Ada", "Sync Bo"],
      answer: "going",
      heads: 3,
      line: "August · Sat 14 · Smoking Goat · Going ✓",
    });

    // Dinner: Can't make it. That night and her guest go; the other night stays.
    await setMemberGoing(outing, ada.id, false);
    assert.deepEqual(await read(), {
      days: [OTHER],
      going: ["Sync Bo"],
      answer: "cant",
      heads: 1,
      line: "August · Sat 14 · Smoking Goat · Can’t",
    });

    // Dates: tap the Chosen Date back on. The guest does not come back with it.
    const on = await saveYear(ada.id, [{ month: MONTH, days: [OTHER, CHOSEN] }], TODAY, "Sync Ada");
    assert.equal(on.ok, true);
    assert.deepEqual(await read(), {
      days: [OTHER, CHOSEN],
      going: ["Sync Ada", "Sync Bo"],
      answer: "going",
      heads: 2,
      line: "August · Sat 14 · Smoking Goat · Going ✓",
    });

    // Dates: tap the Chosen Date off again.
    const off = await saveYear(ada.id, [{ month: MONTH, days: [OTHER] }], TODAY, "Sync Ada");
    assert.equal(off.ok, true);
    assert.deepEqual(await read(), {
      days: [OTHER],
      going: ["Sync Bo"],
      answer: "cant",
      heads: 1,
      line: "August · Sat 14 · Smoking Goat · Can’t",
    });

    // A Visit's attendance row, on its own, is not going. There is no RSVP table.
    await setAttendance(outing, ada.id, true);
    const afterRow = await read();
    assert.deepEqual(afterRow.going, ["Sync Bo"]);
    assert.equal(afterRow.answer, "cant");
    assert.equal(afterRow.line, "August · Sat 14 · Smoking Goat · Can’t");
    assert.equal(afterRow.heads, 1);
  });
});
