import type { UnavailableCheck } from "../types";

const UNAVAILABLE_CHECKS: UnavailableCheck[] = [
  { id: "check.live-reputation", title: "Live domain reputation", reason: "No external reputation service is contacted; analysis stays in this browser." },
  { id: "check.domain-age", title: "Domain registration age", reason: "Registration records are not queried." },
  { id: "check.link-destination", title: "Whether a link destination matches its display text", reason: "Links are parsed as text but are never opened or resolved." },
  { id: "check.sender-identity", title: "Whether the sender or phone number is genuine", reason: "Sender identity cannot be established from message text alone." },
  { id: "check.claim-truth", title: "Whether a claim is true against independent sources", reason: "No outside sources are searched or fetched." },
  { id: "check.images-ocr", title: "Screenshots and images", reason: "Image text is not extracted; this build has no OCR." },
  { id: "check.attachments", title: "Attachments", reason: "Files are not opened or scanned." },
];

/** Return fresh objects so callers cannot mutate the shared disclosure list. */
export function getUnavailableChecks(): UnavailableCheck[] {
  return UNAVAILABLE_CHECKS.map((check) => ({ ...check }));
}
