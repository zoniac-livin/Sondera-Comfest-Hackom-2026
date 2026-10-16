import { describe, expect, it } from "vitest";
import { MESSAGE_SAMPLES } from "./samples";

describe("demo message samples", () => {
  it("contains at least twelve labelled examples across the three categories", () => {
    expect(MESSAGE_SAMPLES.length).toBeGreaterThanOrEqual(12);
    expect(new Set(MESSAGE_SAMPLES.map((sample) => sample.kind))).toEqual(new Set(["scam", "benign", "ambiguous"]));
    expect(MESSAGE_SAMPLES.every((sample) => sample.label && sample.text && sample.id)).toBe(true);
  });
});
