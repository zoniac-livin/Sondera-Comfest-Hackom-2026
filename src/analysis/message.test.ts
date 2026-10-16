import { describe, expect, it } from "vitest";
import { analyzeMessage } from "./message";

const ruleIds = (text: string) => analyzeMessage(text).indicators.map((indicator) => indicator.id);

describe("analyzeMessage rule phrases", () => {
  it.each([
    ["urgency", "URGENT: reply within 24 hours", "msg.urgency", "The parcel will arrive tomorrow afternoon."],
    ["credential request", "Please share your OTP", "msg.credential-request", "The OTP is printed on the form."],
    ["fee request", "Please pay a processing fee", "msg.payment-request", "The word pay appears in the policy."],
    ["legal threat", "A police complaint will be filed", "msg.threat", "The police station is across the road."],
    ["reward claim", "You have won a prize", "msg.reward-lure", "The prize desk opens at noon."],
    ["organization claim", "This is your bank customer care. Share your OTP at https://example.com", "msg.impersonation", "Your bank is near the station."],
    ["secrecy request", "Do not tell anyone about this", "msg.secrecy", "Tell anyone who wants to join."],
    ["job offer", "Work from home and earn ₹5,000 per day", "msg.unsolicited-job", "I work from home on Fridays."],
    ["generic greeting", "Dear customer, your receipt is ready", "msg.generic-greeting", "Dear Maya, your receipt is ready."],
    ["forward pressure", "Forward this to 10 people", "msg.forward-pressure", "Please forward the file to Alex."],
    ["excessive punctuation", "Please review this now!!!!", "msg.excess-formatting", "Please review this now!"],
    ["contact switch", "Please message me on WhatsApp", "msg.contact-switch", "I use WhatsApp with my family."],
  ])("detects %s only with the relevant phrase", (_label, positive, id, negative) => {
    expect(ruleIds(positive)).toContain(id);
    expect(ruleIds(negative)).not.toContain(id);
  });

  it.each([
    "Lunch at 1? I'll bring the notes.",
    "Your parcel was delivered at 3 PM. Thank you for choosing us.",
    "Hey, can you pay me back for dinner whenever? No rush.",
    "This month's newsletter is here. Read the new issue and share feedback when you have time.",
    "Reminder: our planning meeting is Saturday at 10 AM in room 4.",
    "It may rain this evening. Bring an umbrella if you walk home.",
    "I'm working from home this Friday, so let's catch up next week.",
    "The word blocked appears in this documentation.",
    "Police, prize, refund, and pay are words in this vocabulary list.",
  ])("benign or context-free text has no indicator above low: %s", (text) => {
    const result = analyzeMessage(text);
    expect(result.indicators.filter((indicator) => indicator.severity === "medium" || indicator.severity === "high")).toEqual([]);
  });

  it("does not raise medium or high indicators for isolated trigger words", () => {
    const result = analyzeMessage("pay police blocked prize refund OTP");
    expect(result.indicators.filter((indicator) => indicator.severity === "medium" || indicator.severity === "high")).toEqual([]);
  });

  it("recognizes Hinglish urgency and credential requests", () => {
    expect(ruleIds("Abhi verify karo warna account band ho jayega.")).toContain("msg.urgency");
    expect(ruleIds("Apna OTP bhejo abhi.")).toContain("msg.credential-request");
  });

  it("combines a sensitive request with urgency into an informational note", () => {
    const result = analyzeMessage("Your account will be suspended within 24 hours. Please share your OTP.");
    const combination = result.indicators.find((indicator) => indicator.id === "msg.combo-pattern");
    expect(combination?.severity).toBe("info");
    expect(combination?.evidence).toBe("Your account will be suspended within 24 hours. Please share your OTP");
  });

  it("deduplicates overlapping matches and caps repeated matches at three per rule", () => {
    const result = analyzeMessage("Urgent! URGENT! urgent! urgent! urgent!");
    const urgency = result.indicators.filter((indicator) => indicator.id === "msg.urgency");
    expect(urgency).toHaveLength(3);
    expect(new Set(urgency.map((indicator) => `${indicator.span?.start}:${indicator.span?.end}`)).size).toBe(3);
  });

  it("extracts bare domains and www links and merges URL findings with message offsets", () => {
    const text = "Check bit.ly/abc, then www.paypa1.com/login!";
    const result = analyzeMessage(text);
    expect(result.urls).toEqual(["bit.ly/abc", "www.paypa1.com/login"]);
    const lookalike = result.indicators.find((indicator) => indicator.id === "url.lookalike-brand");
    expect(lookalike?.span).toBeDefined();
    expect(text.slice(lookalike!.span!.start, lookalike!.span!.end)).toBe(lookalike?.evidence);
  });

  it("does not extract an email address as a link", () => {
    expect(analyzeMessage("Send it to help@example.com").urls).toEqual([]);
  });

  it("keeps exact evidence and correct spans for every emitted indicator", () => {
    const text = "Dear customer, act now: share your OTP at https://paypa1.com/login";
    const result = analyzeMessage(text);
    expect(result.indicators.length).toBeGreaterThan(0);
    for (const indicator of result.indicators) {
      expect(indicator.span).toBeDefined();
      expect(text.slice(indicator.span!.start, indicator.span!.end)).toBe(indicator.evidence);
    }
  });

  it("handles over-limit input without scanning an unbounded string", () => {
    const text = "A".repeat(20_001);
    const result = analyzeMessage(text);
    expect(result.urls).toEqual([]);
    expect(result.indicators[0].id).toBe("msg.input-too-long");
    expect(text.slice(result.indicators[0].span!.start, result.indicators[0].span!.end)).toBe(result.indicators[0].evidence);
  });

  it("processes 50 URLs and reports links beyond its cap", () => {
    const text = Array.from({ length: 51 }, (_, index) => `example${index}.com`).join(" ");
    const result = analyzeMessage(text);
    expect(result.urls).toHaveLength(50);
    const limit = result.indicators.find((indicator) => indicator.id === "msg.url-limit");
    expect(limit?.evidence).toBe("example50.com");
    expect(text.slice(limit!.span!.start, limit!.span!.end)).toBe(limit?.evidence);
  });
});
