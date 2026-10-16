import { describe, expect, it } from "vitest";
import { generateReceiptJson, generateReceiptMarkdown } from "./receipt";
import { analyze } from "@/analysis";
import type { Case } from "@/types";

function makeCase(input = ""): Case {
  const at = "2026-10-16T10:00:00.000Z";
  return {
    id: "case/AB 12", createdAt: at, updatedAt: at, input, inputType: "message",
    evidence: [], dates: { checked: "2026-10-16" }, checkedQuestions: [], userNotes: "",
    revisions: [{ at, summary: "Case created" }],
  };
}

describe("Decision Receipt exports", () => {
  it("truncates the exported input at 1,000 characters and records the original length", () => {
    const input = `${"x".repeat(1000)}END`;
    const markdown = generateReceiptMarkdown(makeCase(input), "2026-10-16T12:30:00.000Z");
    const json = JSON.parse(generateReceiptJson(makeCase(input), "2026-10-16T12:30:00.000Z"));
    expect(markdown).toContain("first 1,000 characters of 1,003");
    expect(markdown).not.toContain("END");
    expect(json.originalInput).toBe("x".repeat(1000));
    expect(json.inputTruncated).toBe(true);
    expect(json.inputOriginalLength).toBe(1003);
  });

  it("handles empty evidence with an explicit empty state", () => {
    expect(generateReceiptMarkdown(makeCase())).toContain("No evidence notes have been added.");
    expect(JSON.parse(generateReceiptJson(makeCase())).evidence).toEqual([]);
  });

  it("handles a case with no analysis yet and includes the receipt schema version", () => {
    const markdown = generateReceiptMarkdown(makeCase());
    const json = JSON.parse(generateReceiptJson(makeCase()));
    expect(markdown).toContain("No analysis has been run yet");
    expect(markdown).toContain("no overall level is available");
    expect(json.schemaVersion).toBe(1);
    expect(json.level).toBeNull();
    expect(json.checksPerformed).toEqual([]);
  });

  it("preserves special characters in input without breaking Markdown fences or JSON", () => {
    const input = "# <script>alert('x')</script> & **bold** ``` embedded";
    const markdown = generateReceiptMarkdown(makeCase(input));
    const json = JSON.parse(generateReceiptJson(makeCase(input)));
    expect(markdown).toContain("````text\n" + input + "\n````");
    expect(json.originalInput).toBe(input);
  });

  it("uses human-readable level labels in the receipt while keeping JSON values stable", () => {
    const item = makeCase("Dear customer");
    item.analysis = analyze(item.input, "message");
    const markdown = generateReceiptMarkdown(item);
    const json = JSON.parse(generateReceiptJson(item));
    expect(json.level.value).toBe("some-indicators");
    expect(markdown).toContain("**Some indicators**");
    expect(markdown).not.toContain("**some-indicators**");
  });
});
