import type { Analysis, Case, ContextDates, EvidenceNote } from "@/types";

export const STORAGE_KEY = "sondera.case.v1";
export const SCHEMA_VERSION = 1;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type LoadResult = { status: "empty" } | { status: "loaded"; activeCase: Case } | { status: "recovery"; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string { return typeof value === "string"; }

function isIndicator(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && ["url", "message"].includes(String(value.category))
    && ["info", "low", "medium", "high"].includes(String(value.severity))
    && isString(value.title) && isString(value.explanation) && isString(value.evidence)
    && (value.span === undefined || (isRecord(value.span) && typeof value.span.start === "number" && typeof value.span.end === "number"));
}

function isParsedUrl(value: unknown): boolean {
  return isRecord(value) && ["protocol", "hostname", "registrableDomain", "path", "port"].every((key) => isString(value[key]))
    && Array.isArray(value.subdomains) && value.subdomains.every(isString)
    && Array.isArray(value.queryKeys) && value.queryKeys.every(isString);
}

function isUnavailable(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.title) && isString(value.reason);
}

function isMissingProof(value: unknown): boolean {
  return isRecord(value) && isString(value.id) && isString(value.question) && isString(value.why) && isString(value.suggestedAction);
}

function isAnalysis(value: unknown): value is Analysis {
  if (!isRecord(value)) return false;
  return ["message", "url", "claim"].includes(String(value.inputType))
    && isString(value.analyzedAt)
    && Array.isArray(value.indicators) && value.indicators.every(isIndicator)
    && Array.isArray(value.extractedUrls) && value.extractedUrls.every(isParsedUrl)
    && Array.isArray(value.unavailableChecks) && value.unavailableChecks.every(isUnavailable)
    && Array.isArray(value.missingProof) && value.missingProof.every(isMissingProof)
    && ["none-found", "some-indicators", "multiple-indicators", "strong-indicators"].includes(String(value.level))
    && isString(value.levelExplanation);
}

function isEvidence(value: unknown): value is EvidenceNote {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.sourceUrl) && isString(value.title) && isString(value.accessedOn)
    && ["supports", "contradicts", "unclear"].includes(String(value.supports))
    && ["direct", "inference", "repost"].includes(String(value.kind)) && isString(value.note);
}

function isDates(value: unknown): value is ContextDates {
  return isRecord(value) && isString(value.checked)
    && (value.published === undefined || isString(value.published))
    && (value.event === undefined || isString(value.event))
    && (value.received === undefined || isString(value.received));
}

export function isCase(value: unknown): value is Case {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.createdAt) && isString(value.updatedAt)
    && isString(value.input) && ["message", "url", "claim"].includes(String(value.inputType))
    && (value.analysis === undefined || isAnalysis(value.analysis))
    && Array.isArray(value.evidence) && value.evidence.every(isEvidence)
    && isDates(value.dates)
    && Array.isArray(value.checkedQuestions) && value.checkedQuestions.every(isString)
    && isString(value.userNotes)
    && Array.isArray(value.revisions) && value.revisions.every((item) => isRecord(item) && isString(item.at) && isString(item.summary));
}

export function loadCase(storage: StorageLike): LoadResult {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: "recovery", reason: "Browser storage could not be read. Your current work will stay in memory until storage is available." };
  }
  if (raw === null) return { status: "empty" };
  try {
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope) || typeof envelope.schemaVersion !== "number") {
      return { status: "recovery", reason: "Saved case data is incomplete or corrupt. Reset stored data to start a new case." };
    }
    if (envelope.schemaVersion !== SCHEMA_VERSION) {
      return { status: "recovery", reason: `Saved data uses schema version ${envelope.schemaVersion}; this app supports version ${SCHEMA_VERSION}. Reset stored data to start a new case.` };
    }
    if (!isCase(envelope.activeCase)) {
      return { status: "recovery", reason: "Saved case data is incomplete or corrupt. Reset stored data to start a new case." };
    }
    return { status: "loaded", activeCase: envelope.activeCase };
  } catch {
    return { status: "recovery", reason: "Saved case data could not be read. Reset stored data to start a new case." };
  }
}

export function saveCase(storage: StorageLike, activeCase: Case): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, activeCase }));
}

export function clearStoredData(storage: StorageLike): void {
  storage.removeItem(STORAGE_KEY);
}

export function getBrowserStorage(): StorageLike {
  return window.localStorage;
}

