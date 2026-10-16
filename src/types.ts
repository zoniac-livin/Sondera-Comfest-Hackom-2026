export type Severity = "info" | "low" | "medium" | "high";
export type InputType = "message" | "url" | "claim";
export type AnalysisLevel = "none-found" | "some-indicators" | "multiple-indicators" | "strong-indicators";

export interface Indicator {
  id: string;
  category: "url" | "message";
  severity: Severity;
  title: string;
  explanation: string;
  evidence: string;
  span?: { start: number; end: number };
}

export interface ParsedUrl {
  protocol: string;
  hostname: string;
  registrableDomain: string;
  subdomains: string[];
  path: string;
  queryKeys: string[];
  port: string;
}

export interface UnavailableCheck { id: string; title: string; reason: string }
export interface MissingProofQuestion { id: string; question: string; why: string; suggestedAction: string }
export interface Analysis {
  inputType: InputType;
  analyzedAt: string;
  indicators: Indicator[];
  extractedUrls: ParsedUrl[];
  unavailableChecks: UnavailableCheck[];
  level: AnalysisLevel;
  levelExplanation: string;
  missingProof: MissingProofQuestion[];
}

export interface EvidenceNote {
  id: string; sourceUrl: string; title: string; accessedOn: string;
  supports: "supports" | "contradicts" | "unclear";
  kind: "direct" | "inference" | "repost"; note: string;
}
export interface ContextDates { published?: string; event?: string; received?: string; checked: string }
export interface Case {
  id: string; createdAt: string; updatedAt: string; input: string; inputType: InputType;
  analysis?: Analysis; evidence: EvidenceNote[]; dates: ContextDates; checkedQuestions: string[]; userNotes: string;
  revisions: { at: string; summary: string }[];
}
