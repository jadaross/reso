import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { groupSecretOnScreen, notFoundView } from "./not-found";

const EXPLANATION =
  "A private site for one group of friends. If you are one of them, open the link from the group chat.";

describe("not-found", () => {
  it("links back to Dinner when a Group Link is remembered", () => {
    assert.deepEqual(notFoundView("k7m2q9xr4vn8bc3t"), {
      title: "Nothing here.",
      backHref: "/g/k7m2q9xr4vn8bc3t",
    });
  });

  it("gives the root page's one-line explanation and no link otherwise", () => {
    assert.deepEqual(notFoundView(null), {
      title: "Nothing here.",
      explanation: EXPLANATION,
    });
  });

  it("does not turn a malformed secret into a link", () => {
    assert.deepEqual(notFoundView("../dinner"), {
      title: "Nothing here.",
      explanation: EXPLANATION,
    });
    assert.equal("backHref" in notFoundView("https://evil.example"), false);
  });

  it("remembers the Group Link only on a real screen", () => {
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t"), "k7m2q9xr4vn8bc3t");
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/dates"), "k7m2q9xr4vn8bc3t");
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/places"), "k7m2q9xr4vn8bc3t");
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/past"), "k7m2q9xr4vn8bc3t");
    assert.equal(
      groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/restaurants"),
      "k7m2q9xr4vn8bc3t",
    );
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/history"), "k7m2q9xr4vn8bc3t");
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/places/"), "k7m2q9xr4vn8bc3t");
  });

  it("does not remember the Group Link on a mistyped path", () => {
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/place"), null);
    assert.equal(groupSecretOnScreen("/g/k7m2q9xr4vn8bc3t/places/extra"), null);
    assert.equal(groupSecretOnScreen("/nope"), null);
    assert.equal(groupSecretOnScreen("/g"), null);
  });
});
