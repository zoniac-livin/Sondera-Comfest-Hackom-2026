import { describe, expect, it } from "vitest";
import { assessLevel, levelLabel } from "./level";
import type { Indicator, Severity } from "../types";

function indicators(...severities: Severity[]): Indicator[] {
  return severities.map((severity, index) => ({
    id: `test.${index}`, category: "message", severity,
    title: "Test observation", explanation: "Test explanation", evidence: "phrase",
    span: { start: 0, end: 6 },
  }));
}

describe("assessLevel", () => {
  it.each([
    ["none-found", "No indicators found"],
    ["some-indicators", "Some indicators"],
    ["multiple-indicators", "Notable indicators"],
    ["strong-indicators", "Strong indicators"],
  ] as const)("uses an accurate human-readable label for %s", (level, label) => {
    expect(levelLabel(level)).toBe(label);
  });
  it("labels one high indicator as notable and two as strong", () => {
    expect(levelLabel(assessLevel(indicators("high")).level)).toBe("Notable indicators");
    expect(levelLabel(assessLevel(indicators("high", "high")).level)).toBe("Strong indicators");
  });

  it("ignores info-only indicators and uses the required none-found wording", () => {
    const result = assessLevel(indicators("info", "info"));
    expect(result.level).toBe("none-found");
    expect(result.explanation).toContain("These local checks found no indicators. This does not mean the content is genuine or safe.");
    expect(result.explanation).toContain("Automated checks can miss threats and can flag legitimate content.");
  });

  it.each([
    [["low"], "some-indicators"],
    [["medium", "low"], "some-indicators"],
    [["low", "low", "low"], "multiple-indicators"],
    [["high"], "multiple-indicators"],
    [["high", "high"], "strong-indicators"],
    [["high", "medium", "medium"], "strong-indicators"],
  ] as Array<[Severity[], string]>)("maps %j to %s", (severities, expected) => {
    expect(assessLevel(indicators(...severities)).level).toBe(expected);
  });

  it("counts only non-info indicators in its explanation", () => {
    const result = assessLevel(indicators("info", "high", "medium", "low"));
    expect(result.explanation).toContain("1 high, 1 medium, and 1 low indicators");
    expect(result.explanation).toContain("3 non-info observations");
  });

  it("uses singular observation grammar for one non-info indicator", () => {
    expect(assessLevel(indicators("info", "low")).explanation).toContain("1 non-info observation).");
    expect(assessLevel(indicators("info", "medium", "low")).explanation).toContain("2 non-info observations).");
  });
});
