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

  it("handles empty and 20,000-character messages and Unicode-heavy text without throwing", () => {
    expect(() => analyze("", "message")).not.toThrow();
    expect(analyze("", "message").level).toBe("none-found");
    expect(() => analyze("a ".repeat(10_000), "message")).not.toThrow();
    expect(analyze("a ".repeat(10_000), "message").inputType).toBe("message");
    expect(() => analyze("ह🙂漢字".repeat(5_000), "message")).not.toThrow();
    expect(analyze("ह🙂漢字".repeat(5_000), "message").inputType).toBe("message");
  });

  it("analyzes 50 embedded URLs locally and reports the cap when there are more", () => {
    const fiftyUrls = Array.from({ length: 50 }, (_, index) => `https://example${index}.com/path`).join(" ");
    const result = analyze(fiftyUrls, "message");
    expect(result.extractedUrls).toHaveLength(50);
    expect(result.indicators.some((indicator) => indicator.id === "msg.url-limit")).toBe(false);

    const fiftyOneUrls = `${fiftyUrls} https://example50.com/path`;
    const capped = analyze(fiftyOneUrls, "message");
    expect(capped.extractedUrls).toHaveLength(50);
    expect(capped.indicators.find((indicator) => indicator.id === "msg.url-limit")?.evidence).toBe("https://example50.com/path");
  });
});
