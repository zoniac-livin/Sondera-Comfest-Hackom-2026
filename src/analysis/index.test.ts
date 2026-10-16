import { describe, expect, it } from "vitest";
import { analyze } from "./index";

describe("analysis orchestrator", () => {
  it("auto-detects a single URL and runs the URL rules", () => {
    const result = analyze("https://paypa1.com/login");
    expect(result.inputType).toBe("url");
    expect(result.indicators.some((indicator) => indicator.id === "url.lookalike-brand")).toBe(true);
    expect(result.extractedUrls[0]?.registrableDomain).toBe("paypa1.com");
  });

  it("analyzes messages and offsets embedded URL evidence to the original message", () => {
    const text = "Check this link: https://paypa1.com/login";
    const result = analyze(text, "message");
    const indicator = result.indicators.find((item) => item.id === "url.lookalike-brand");
    expect(result.inputType).toBe("message");
    expect(text.slice(indicator!.span!.start, indicator!.span!.end)).toBe(indicator?.evidence);
    expect(result.extractedUrls).toHaveLength(1);
  });

  it("includes unavailable checks, a level, and context-aware Phase 5 questions", () => {
    const result = analyze("A normal note.", "claim");
    expect(result.inputType).toBe("claim");
    expect(result.level).toBe("none-found");
    expect(result.unavailableChecks.length).toBeGreaterThanOrEqual(7);
    expect(result.missingProof.map((question) => question.id)).toEqual(["proof.primary-source", "proof.publication-date", "proof.original-author"]);
    expect(Number.isNaN(Date.parse(result.analyzedAt))).toBe(false);
  });
});
