import { analyzeContextDates } from "@/analysis/contextClock";
import { getUnavailableChecks } from "@/analysis/unavailable";
import { levelLabel } from "@/analysis/level";
import type { AnalysisLevel, Case, Indicator, Severity } from "@/types";

export const RECEIPT_SCHEMA_VERSION = 1;
export const RECEIPT_LIMITATIONS = "These local checks are limited and can miss threats or flag legitimate content. This receipt records observations and unknowns; it does not establish whether content is safe, verified, or genuine.";

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low", "info"];

export function recommendedActions(level: AnalysisLevel | undefined): string[] {
  if (!level) {
    return ["No analysis has been run yet. If you need to act on this message, consider pausing to check the request independently.", ...BASE_ACTIONS];
  }
  switch (level) {
    case "strong-indicators":
      return ["Several high or combined observations were found. Consider pausing and checking independently before acting.", ...BASE_ACTIONS];
    case "multiple-indicators":
      return ["Multiple observations, including at least one high-severity observation, were found. Consider pausing before acting.", ...BASE_ACTIONS];
    case "some-indicators":
      return ["Some observations were found. Consider checking the request through a separate channel before acting.", ...BASE_ACTIONS];
    default:
      return ["No indicators were produced by these local checks. If the message asks you to act, you can still verify the request independently.", ...BASE_ACTIONS];
  }
}

const BASE_ACTIONS = [
  "Avoid clicking links or replying until you have checked the message independently.",
  "Never share an OTP, PIN, or password in response to a message.",
  "Contact the organization through an official channel you already trust, such as a saved number or an address you type yourself.",
  "If the sender is unwanted, consider blocking the sender and warn family members who may receive the same message.",
  "In India, report suspected cybercrime through the National Cyber Crime Reporting Portal at cybercrime.gov.in or call the 1930 helpline.",
  "If money or card details were shared, contact your bank immediately.",
];

export interface ReceiptData {
  schemaVersion: number;
  caseId: string;
  generatedAt: string;
  originalInput: string;
  inputTruncated: boolean;
  inputOriginalLength: number;
  checksPerformed: string[];
  checksNotPerformed: { id: string; title: string; reason: string }[];
  findings: Record<Severity, Pick<Indicator, "id" | "category" | "severity" | "title" | "explanation" | "evidence">[]>;
  level: { value: AnalysisLevel; explanation: string } | null;
  evidence: Case["evidence"];
  unresolvedQuestions: NonNullable<Case["analysis"]>["missingProof"];
  timeline: ReturnType<typeof analyzeContextDates>["timeline"];
  dateWarnings: ReturnType<typeof analyzeContextDates>["warnings"];
  recommendedActions: string[];
  userNotes: string;
  revisions: Case["revisions"];
  limitations: string;
}

export function createReceiptData(caseData: Case, generatedAt = new Date().toISOString()): ReceiptData {
  const inputOriginalLength = caseData.input.length;
  const dateContext = analyzeContextDates(caseData.dates, caseData.dates.checked);
  const findings: ReceiptData["findings"] = { high: [], medium: [], low: [], info: [] };
  for (const indicator of caseData.analysis?.indicators ?? []) {
    findings[indicator.severity].push({
      id: indicator.id, category: indicator.category, severity: indicator.severity,
      title: indicator.title, explanation: indicator.explanation, evidence: indicator.evidence,
    });
  }
  const checksPerformed: string[] = [];
  if (caseData.analysis) {
    if (caseData.analysis.inputType === "url") checksPerformed.push("URL checks: address parsing, domain and brand patterns, link structure, and connection details.");
    else {
      checksPerformed.push("Message checks: urgency, requests for credentials or payment, threats, rewards, impersonation, secrecy, job offers, generic greetings, forwarding pressure, contact changes, and formatting.");
      if (caseData.analysis.extractedUrls.length) checksPerformed.push("URL checks: address parsing, domain and brand patterns, link structure, and connection details for links found in the message.");
    }
    checksPerformed.push("Missing-Proof question selection based on the input and local observations.");
  }
  if (caseData.analysis || caseData.dates.published || caseData.dates.event || caseData.dates.received) {
    checksPerformed.push("Context Clock date-presence, ordering, and delay checks based on the dates entered by the user.");
  }
  return {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    caseId: caseData.id,
    generatedAt,
    originalInput: caseData.input.slice(0, 1000),
    inputTruncated: inputOriginalLength > 1000,
    inputOriginalLength,
    checksPerformed,
    checksNotPerformed: caseData.analysis?.unavailableChecks ?? getUnavailableChecks(),
    findings,
    level: caseData.analysis ? { value: caseData.analysis.level, explanation: caseData.analysis.levelExplanation } : null,
    evidence: caseData.evidence,
    unresolvedQuestions: (caseData.analysis?.missingProof ?? []).filter((question) => !caseData.checkedQuestions.includes(question.id)),
    timeline: dateContext.timeline,
    dateWarnings: dateContext.warnings,
    recommendedActions: recommendedActions(caseData.analysis?.level),
    userNotes: caseData.userNotes,
    revisions: caseData.revisions,
    limitations: RECEIPT_LIMITATIONS,
  };
}

function codeFence(text: string): string {
  const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(Math.max(3, longest + 1));
}

function fenced(text: string): string {
  const fence = codeFence(text);
  return `${fence}text\n${text}\n${fence}`;
}

function escapeMarkdown(text: string): string {
  const markdownMeta = new Set(["\\", "`", "*", "_", "{", "}", "[", "]", "(", ")", "#", "+", "-", ".", "!", "|", ">"]);
  return [...text].map((character) => markdownMeta.has(character) ? `\\${character}` : character).join("");
}

export function generateReceiptMarkdown(caseData: Case, generatedAt?: string): string {
  const receipt = createReceiptData(caseData, generatedAt);
  const lines: string[] = [
    "# Sondera Decision Receipt", "", `**Case ID:** ${escapeMarkdown(receipt.caseId)}`, `**Generated:** ${escapeMarkdown(receipt.generatedAt)}`, "",
    "## Original input", fenced(receipt.originalInput),
  ];
  if (receipt.inputTruncated) lines.push(`_Input truncated to the first 1,000 characters of ${receipt.inputOriginalLength.toLocaleString()}._`);
  lines.push("", "## Checks actually performed");
  lines.push(...(receipt.checksPerformed.length ? receipt.checksPerformed.map((item) => `- ${item}`) : ["- No analysis has been run yet; no local message or URL rules are recorded as performed."]));
  lines.push("", "## Checks not performed");
  for (const check of receipt.checksNotPerformed) lines.push(`- **${check.title}:** ${check.reason}`);
  lines.push("", "## Findings");
  for (const severity of SEVERITY_ORDER) {
    lines.push(`### ${severity[0].toUpperCase()}${severity.slice(1)}`);
    const group = receipt.findings[severity];
    if (!group.length) { lines.push("_No findings in this severity._", ""); continue; }
    for (const finding of group) lines.push(`- **${finding.title}** (${finding.id})\n  - Explanation: ${finding.explanation}\n  - Exact evidence: ${fenced(finding.evidence)}`);
    lines.push("");
  }
  lines.push("## Overall level", receipt.level ? `**${levelLabel(receipt.level.value)}** — ${receipt.level.explanation}` : "No analysis has been run for this case yet, so no overall level is available.", "", "## Evidence references");
  if (!receipt.evidence.length) lines.push("No evidence notes have been added.");
  else for (const note of receipt.evidence) lines.push(`### Evidence note\n- **Title:** ${fenced(note.title || "Untitled source")}\n- **Source URL:** ${fenced(note.sourceUrl || "Not provided")}\n- **Relationship:** ${note.supports}\n- **Source type:** ${note.kind}\n- **Date accessed:** ${escapeMarkdown(note.accessedOn)}\n- **Note:** ${fenced(note.note)}`);
  lines.push("", "## Unresolved questions");
  if (!receipt.unresolvedQuestions.length) lines.push("No unticked Missing-Proof questions are recorded.");
  else lines.push(...receipt.unresolvedQuestions.map((question) => `- ${question.question}\n  - Why: ${question.why}\n  - Suggested action: ${question.suggestedAction}`));
  lines.push("", "## Context Clock timeline");
  if (!receipt.timeline.length) lines.push("No dates were entered.");
  else lines.push(...receipt.timeline.map((point) => `- **${point.label}:** ${point.date}`));
  lines.push("", "### Date warnings");
  if (!receipt.dateWarnings.length) lines.push("No date warnings from the entered dates.");
  else lines.push(...receipt.dateWarnings.map((warning) => `- ${warning.message}`));
  lines.push("", "## Recommended actions", ...receipt.recommendedActions.map((action) => `- ${action}`));
  lines.push("", "## User notes", receipt.userNotes ? fenced(receipt.userNotes) : "No user notes.");
  lines.push("", "## Revision history");
  if (!receipt.revisions.length) lines.push("No revision entries.");
  else lines.push(...receipt.revisions.map((revision) => `- **${revision.at}:** ${revision.summary}`));
  lines.push("", "## Limitations", receipt.limitations, "");
  return lines.join("\n");
}

export function generateReceiptJson(caseData: Case, generatedAt?: string): string {
  return JSON.stringify(createReceiptData(caseData, generatedAt), null, 2);
}

export function receiptFilename(caseId: string, extension: "md" | "json"): string {
  const safeId = caseId.replace(/[^a-z\d_-]/gi, "-").slice(0, 80) || "case";
  return `sondera-receipt-${safeId}.${extension}`;
}
