import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyHost,
  isFetchableUrl,
  isShortLink,
  parsePlaceUrl,
} from "./parse";

describe("host classification and the SSRF gate", () => {
  it("recognises the hosts we are willing to fetch", () => {
    assert.equal(classifyHost("maps.apple.com"), "apple");
    assert.equal(classifyHost("maps.apple"), "apple");
    assert.equal(classifyHost("maps.app.goo.gl"), "google");
    assert.equal(classifyHost("www.google.com"), "google");
    assert.equal(classifyHost("maps.google.co.uk"), "google");
  });

  it("refuses anything not on the allow-list", () => {
    assert.equal(classifyHost("evil.com"), "unknown");
    assert.equal(classifyHost("localhost"), "unknown");
    // Suffix attacks: the real host is evil.com in both.
    assert.equal(classifyHost("maps.apple.com.evil.com"), "unknown");
    assert.equal(classifyHost("google.com.evil.com"), "unknown");
    assert.equal(classifyHost("notgoogle.com"), "unknown");
  });

  it("only fetches https, and only allow-listed hosts", () => {
    assert.equal(isFetchableUrl("https://maps.apple.com/place?name=X"), true);
    assert.equal(isFetchableUrl("http://maps.apple.com/place?name=X"), false);
    assert.equal(isFetchableUrl("https://evil.com/maps.apple.com"), false);
    assert.equal(isFetchableUrl("http://169.254.169.254/latest/meta-data/"), false);
    assert.equal(isFetchableUrl("file:///etc/passwd"), false);
    assert.equal(isFetchableUrl("not a url at all"), false);
  });

  it("spots the short forms that need resolving first", () => {
    assert.equal(isShortLink("https://maps.app.goo.gl/m958yYewXcebcdtEA"), true);
    assert.equal(isShortLink("https://maps.apple/p/U8rE9v8n8iVZjr"), true);
    assert.equal(isShortLink("https://maps.apple.com/place?name=X"), false);
  });
});

describe("Apple links", () => {
  it("reads name, address and coordinates straight out of the query string", () => {
    const parsed = parsePlaceUrl(
      "https://maps.apple.com/place?address=7%20Boundary%20St%2C%20London&coordinate=51.5238,-0.0776&name=Dishoom%20Shoreditch&place-id=I92B6B8F2DEB50DC2&map=explore",
    );
    assert.equal(parsed.source, "apple");
    assert.equal(parsed.name, "Dishoom Shoreditch");
    assert.equal(parsed.address, "7 Boundary St, London");
    assert.equal(parsed.lat, 51.5238);
    assert.equal(parsed.lng, -0.0776);
    assert.equal(parsed.externalPlaceId, "I92B6B8F2DEB50DC2");
  });

  it("copes with a link carrying only a place id", () => {
    const parsed = parsePlaceUrl(
      "https://maps.apple.com/place?place-id=I92B6B8F2DEB50DC2",
    );
    assert.equal(parsed.name, null);
    assert.equal(parsed.lat, null);
    assert.equal(parsed.externalPlaceId, "I92B6B8F2DEB50DC2");
  });

  it("accepts the older q/ll form", () => {
    const parsed = parsePlaceUrl(
      "https://maps.apple.com/?q=Kiln&ll=51.5115,-0.1339",
    );
    assert.equal(parsed.name, "Kiln");
    assert.equal(parsed.lat, 51.5115);
  });
});

describe("Google links", () => {
  const real =
    "https://www.google.com/maps/place/Dishoom+Covent+Garden/@51.5125176,-0.129404,17z/data=!3m1!4b1!4m6!3m5!1s0x487604b7c7d895c5:0x9c3887a3670e0076!8m2!3d51.5125176!4d-0.1268291!16s%2Fg%2F1tdjwh2v";

  it("takes the name from the path and the pin from !3d/!4d", () => {
    const parsed = parsePlaceUrl(real);
    assert.equal(parsed.source, "google");
    assert.equal(parsed.name, "Dishoom Covent Garden");
    assert.equal(parsed.lat, 51.5125176);
    // The pin, not the -0.129404 viewport centre earlier in the same URL.
    assert.equal(parsed.lng, -0.1268291);
    assert.equal(parsed.externalPlaceId, "0x487604b7c7d895c5:0x9c3887a3670e0076");
  });

  it("never invents an address, because Google links do not carry one", () => {
    assert.equal(parsePlaceUrl(real).address, null);
  });

  it("falls back to the viewport centre when there is no pin", () => {
    const parsed = parsePlaceUrl(
      "https://www.google.com/maps/place/Kiln/@51.5115,-0.1339,17z/",
    );
    assert.equal(parsed.name, "Kiln");
    assert.equal(parsed.lat, 51.5115);
    assert.equal(parsed.lng, -0.1339);
  });
});

describe("bad input", () => {
  it("returns an empty parse rather than throwing", () => {
    for (const input of ["", "hello", "https://evil.com/x", "javascript:alert(1)"]) {
      const parsed = parsePlaceUrl(input);
      assert.equal(parsed.source, "unknown");
      assert.equal(parsed.name, null);
    }
  });

  it("rejects coordinates outside the possible range", () => {
    const parsed = parsePlaceUrl(
      "https://maps.apple.com/place?name=Nowhere&coordinate=999,-0.1",
    );
    assert.equal(parsed.name, "Nowhere");
    assert.equal(parsed.lat, null);
  });
});
