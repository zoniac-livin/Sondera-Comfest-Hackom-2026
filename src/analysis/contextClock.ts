import type { ContextDates } from "../types";

export type ContextDateField = "published" | "event" | "received";
export interface ContextClockWarning { id: string; field?: ContextDateField; message: string }
export interface TimelinePoint { field: ContextDateField | "checked"; label: string; date: string }
export interface ContextClockResult { checked: string; warnings: ContextClockWarning[]; timeline: TimelinePoint[] }

function localIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return parsed;
}

function calendarYearBefore(date: Date): Date {
  const year = date.getUTCFullYear() - 1;
  const month = date.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

/** Evaluates entered dates only; it makes no claim about whether a message is current or true. */
export function analyzeContextDates(dates: ContextDates, today = localIsoDate(new Date())): ContextClockResult {
  const checked = parseIsoDate(today) ? today : localIsoDate(new Date());
  const checkedDate = parseIsoDate(checked)!;
  const values: Array<{ field: ContextDateField; label: string; value?: string }> = [
    { field: "published", label: "Published", value: dates.published },
    { field: "event", label: "Event", value: dates.event },
    { field: "received", label: "Received", value: dates.received },
  ];
  const warnings: ContextClockWarning[] = [];
  const validDates = new Map<ContextDateField, Date>();

  for (const item of values) {
    if (!item.value) continue;
    const parsed = parseIsoDate(item.value);
    if (!parsed) {
      warnings.push({ id: `invalid-${item.field}`, field: item.field, message: `Worth checking: the ${item.label.toLowerCase()} date is invalid; enter a calendar date.` });
      continue;
    }
    validDates.set(item.field, parsed);
    if (parsed > checkedDate) {
      warnings.push({ id: `future-${item.field}`, field: item.field, message: `Worth checking: the ${item.label.toLowerCase()} date is in the future; confirm that it is intended.` });
    }
  }

  const published = validDates.get("published");
  const event = validDates.get("event");
  const received = validDates.get("received");

  if (!dates.published) {
    warnings.push({ id: "missing-published", field: "published", message: "Worth checking: no publication date is entered, so stale or context-stripped content cannot be ruled out." });
  } else if (published && published < calendarYearBefore(checkedDate)) {
    warnings.push({ id: "old-content", field: "published", message: "Worth checking: old content may be recirculated without context." });
  }

  if (received && ((published && published > received) || (event && event > received))) {
    warnings.push({ id: "inconsistent-dates", message: "Worth checking: the entered dates are inconsistent because an event or publication date is after the received date." });
  }

  if (published && received && received.getTime() - published.getTime() > 90 * 24 * 60 * 60 * 1000) {
    warnings.push({ id: "long-delay", field: "received", message: "Worth checking: this arrived long after it was first published; check whether it still applies." });
  }

  const timeline: TimelinePoint[] = values.flatMap((item) => {
    const date = dates[item.field];
    return date && validDates.has(item.field) ? [{ field: item.field, label: item.label, date }] : [];
  });
  timeline.push({ field: "checked", label: "Checked", date: checked });
  timeline.sort((left, right) => left.date.localeCompare(right.date) || left.field.localeCompare(right.field));

  return { checked, warnings, timeline };
}

export function getLocalToday(date = new Date()): string {
  return localIsoDate(date);
}
