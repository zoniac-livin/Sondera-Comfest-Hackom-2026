import { describe, expect, it } from "vitest";
import { getUnavailableChecks } from "./unavailable";

describe("getUnavailableChecks", () => {
  it("always discloses the minimum set of checks that are not performed", () => {
    const checks = getUnavailableChecks();
    const ids = checks.map((check) => check.id);
    expect(ids).toEqual([
      "check.live-reputation", "check.domain-age", "check.link-destination",
      "check.sender-identity", "check.claim-truth", "check.images-ocr", "check.attachments",
    ]);
    expect(checks.every((check) => check.title && check.reason)).toBe(true);
  });

  it("returns fresh items so one caller cannot alter later disclosures", () => {
    const first = getUnavailableChecks();
    first[0].title = "Changed by caller";
    expect(getUnavailableChecks()[0].title).toBe("Live domain reputation");
  });
});
