import { describe, expect, it } from "vitest";
import { analyzeContextDates, getLocalToday } from "./contextClock";
import type { ContextDates } from "../types";

const today = "2026-10-16";
const dates = (partial: Partial<ContextDates> = {}): ContextDates => ({ checked: today, ...partial });

describe("analyzeContextDates", () => {
  it("sets checked to today and warns when the publication date is missing", () => {
    const result = analyzeContextDates(dates(), today);
    expect(result.checked).toBe(today);
    expect(result.warnings.map((warning) => warning.id)).toContain("missing-published");
    expect(result.warnings[0].message).toContain("Worth checking:");
    expect(result.timeline).toEqual([{ field: "checked", label: "Checked", date: today }]);
  });

  it("flags content published more than twelve months earlier, but not exactly twelve months earlier", () => {
    expect(analyzeContextDates(dates({ published: "2025-10-15" }), today).warnings.map((warning) => warning.id))
      .toContain("old-content");
    expect(analyzeContextDates(dates({ published: "2025-10-16" }), today).warnings.map((warning) => warning.id))
      .not.toContain("old-content");
  });

  it("flags inconsistent and long-delay dates", () => {
    const result = analyzeContextDates(dates({ published: "2026-01-01", event: "2026-10-14", received: "2026-10-10" }), today);
    expect(result.warnings.map((warning) => warning.id)).toContain("inconsistent-dates");
    expect(result.warnings.map((warning) => warning.id)).toContain("long-delay");
  });

  it("warns on invalid calendar dates without crashing", () => {
    const result = analyzeContextDates(dates({ published: "2026-02-30", event: "not-a-date" }), today);
    expect(result.warnings.map((warning) => warning.id)).toContain("invalid-published");
    expect(result.warnings.map((warning) => warning.id)).toContain("invalid-event");
    expect(result.timeline.map((point) => point.field)).toEqual(["checked"]);
  });

  it("labels future publication, event, and received dates as worth checking", () => {
    const result = analyzeContextDates(dates({ published: "2026-12-01", event: "2026-12-05", received: "2026-12-10" }), today);
    expect(result.warnings.map((warning) => warning.id)).toEqual(["future-published", "future-event", "future-received"]);
    expect(result.warnings.every((warning) => warning.message.startsWith("Worth checking:"))).toBe(true);
  });

  it("orders entered dates and checked on the horizontal timeline", () => {
    const result = analyzeContextDates(dates({ published: "2026-01-01", event: "2026-05-01", received: "2026-08-01" }), today);
    expect(result.timeline.map((point) => point.field)).toEqual(["published", "event", "received", "checked"]);
  });

  it("uses the local calendar date for today", () => {
    const date = new Date("2026-10-16T22:00:00.000Z");
    const expected = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    expect(getLocalToday(date)).toBe(expected);
  });
});
