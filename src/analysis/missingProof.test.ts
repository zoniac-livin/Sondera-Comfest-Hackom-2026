import { describe, expect, it } from "vitest";
import { findMissingProof } from "./missingProof";
import type { Indicator } from "../types";

function indicators(...ids: string[]): Indicator[] {
  return ids.map((id) => ({
    id, category: id.startsWith("url.") ? "url" : "message", severity: "high",
    title: "Test observation", explanation: "Test explanation", evidence: "matched phrase", span: { start: 0, end: 14 },
  }));
}

describe("findMissingProof", () => {
  it("prioritizes organization and sensitive-request questions, then includes a link and author question", () => {
    const result = findMissingProof({
      input: "Your SBI account is locked. Share your OTP at https://sbi-kyc-update.top",
      inputType: "message",
      indicators: indicators("msg.impersonation", "msg.credential-request", "url.brand-in-domain"),
      hasUrl: true,
    });
    expect(result.map((question) => question.id)).toEqual([
      "proof.organization-channel", "proof.request-policy", "proof.link-destination",
      "proof.publication-date", "proof.original-author",
    ]);
    for (const question of result) {
      expect(question.question.length).toBeGreaterThan(0);
      expect(question.why.length).toBeGreaterThan(0);
      expect(question.suggestedAction.length).toBeGreaterThan(0);
    }
  });

  it("adds primary-source, viral, date, and statistic questions with a six-item cap", () => {
    const result = findMissingProof({
      input: "Forwarded viral claim: 80 percent of people agree.",
      inputType: "claim",
      indicators: indicators("msg.forward-pressure"),
      hasUrl: false,
    });
    expect(result).toHaveLength(5);
    expect(result.map((question) => question.id)).toEqual([
      "proof.independent-confirmation", "proof.primary-source", "proof.publication-date",
      "proof.statistic-source", "proof.original-author",
    ]);
  });

  it("caps competing checks at six and always keeps the author question", () => {
    const result = findMissingProof({
      input: "Forwarded viral claim 12 percent, click https://example.com",
      inputType: "claim",
      indicators: indicators("msg.impersonation", "msg.payment-request", "msg.forward-pressure", "url.brand-in-domain"),
      hasUrl: true,
    });
    expect(result).toHaveLength(6);
    expect(result.at(-1)?.id).toBe("proof.original-author");
  });

  it("always supplies a checkable original-author question when no other context is present", () => {
    expect(findMissingProof({ input: "Hello", inputType: "message", indicators: [], hasUrl: false }).map((item) => item.id))
      .toEqual(["proof.publication-date", "proof.original-author"]);
  });
});
