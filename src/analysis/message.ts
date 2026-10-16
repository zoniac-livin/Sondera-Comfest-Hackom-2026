import { analyzeUrl } from "./url";
import type { Indicator, Severity } from "../types";

const MAX_TEXT_LENGTH = 20_000;
const MAX_URLS = 50;

interface MessageRule {
  id: string;
  severity: Severity;
  title: string;
  explanation: string;
  patterns: RegExp[];
}

interface UrlMatch { value: string; start: number; end: number }

const MESSAGE_RULES: MessageRule[] = [
  {
    id: "msg.urgency", severity: "medium", title: "Pressure to act quickly",
    explanation: "Urgency can discourage a careful check. Pause and verify the request through a separate, trusted channel.",
    patterns: [/(?:\burgent\b|\bimmediately\b|\bwithin\s+24\s+hours\b|\blast\s+chance\b|\bexpires?\s+today\b|\bact\s+now\b|\b(?:your\s+)?account\s+will\s+be\s+(?:blocked|suspended|closed)\b|\b(?:account|sim|service)\b.{0,28}\bband\s+ho\s+(?:jayega|jaega)\b|\b(?:verify|update|submit|reply|click|act|pay)\b.{0,30}\b(?:turant|abhi|jaldi)\b|\b(?:turant|abhi|jaldi)\b.{0,30}\b(?:verify|update|submit|reply|click|act|pay)\b)/i],
  },
  {
    id: "msg.credential-request", severity: "high", title: "Request for sensitive account information",
    explanation: "A request for a password, one-time code, or financial identifier can give someone access to an account. Check the organization's advice using a channel you already trust.",
    patterns: [
      /\b(?:please\s+)?(?:share|send|enter|provide|submit|tell|give|reply\s+with|need|require|ask(?:ing)?\s+for)\s+(?:(?:me|us)\s+)?(?:(?:your|the)\s+)?(?:one[- ]time(?:\s+password)?|otp|pin|cvv|password|card\s+number|credit\s+card\s+details|account\s+number|aadhaar(?:\s+number)?|pan(?:\s+number)?)\b/i,
      /\b(?:otp|pin|password)\s+(?:bhej(?:o|iye)?|share\s+karo|send\s+karo)\b/i,
    ],
  },
  {
    id: "msg.payment-request", severity: "high", title: "Request to send money or pay a fee",
    explanation: "Unexpected fees, transfers, and gift-card requests can be used to take money before a person has time to verify the reason.",
    patterns: [
      /\b(?:pay|send|transfer|deposit)\s+(?:(?:a|the|your)\s+)?(?:processing|registration|delivery|refund|release|verification|security)\s+fee\b/i,
      /\b(?:pay|send|transfer|deposit)\s+(?:₹|rs\.?\s*)\s?\d[\d,]*(?:\.\d{1,2})?\b/i,
      /\b(?:send|transfer)\s+(?:me\s+)?money\b/i,
      /\b(?:buy|purchase)\s+(?:(?:me|a)\s+)?gift\s+card\b/i,
      /\bpay\s+(?:via|using)\s+(?:upi|crypto|bitcoin|a\s+wallet)\b/i,
      /\b(?:send|transfer)\s+(?:crypto|bitcoin|ethereum|eth|usdt|funds?)\s+to\s+(?:(?:my|the)\s+)?(?:wallet|address|upi)\b/i,
    ],
  },
  {
    id: "msg.threat", severity: "medium", title: "Threat or consequence language",
    explanation: "Threats of legal trouble, arrest, or disconnection can push people into acting before checking who sent the message.",
    patterns: [
      /\blegal\s+action\b/i,
      /\barrest\s+warrant\b/i,
      /\bpolice\s+(?:will\s+\w+|case\b|complaint\b|action\b|have\s+been\s+informed\b)/i,
      /\b(?:service|connection|sim)\s+will\s+be\s+disconnected\b/i,
      /\bpenalty\s+(?:will|may)\s+(?:apply|be\s+imposed)\b/i,
      /\byou\s+will\s+be\s+arrested\b/i,
    ],
  },
  {
    id: "msg.reward-lure", severity: "medium", title: "Prize or reward claim",
    explanation: "A surprise prize or reward can be used to draw someone into sharing information, paying a fee, or opening a link.",
    patterns: [
      /\byou\s+have\s+won\b/i,
      /\bwon\s+(?:a\s+)?(?:prize|lottery|cashback|free\s+gift)\b/i,
      /\b(?:lottery|prize)\s+winner\b/i,
      /\bcashback\s+(?:of\s+)?(?:₹|rs\.?\s*)\s?\d[\d,]*\b/i,
      /\bfree\s+gift\b/i,
      /\bclaim\s+(?:your\s+)?(?:prize|reward|cashback|gift)\s+now\b/i,
    ],
  },
  {
    id: "msg.secrecy", severity: "medium", title: "Request to keep the message secret",
    explanation: "Secrecy can isolate someone from people who might help them check a request independently.",
    patterns: [/\bdo\s+not\s+tell\s+anyone\b/i, /\bdon['’]?t\s+tell\s+anyone\b/i, /\bkeep\s+this\s+confidential\b/i],
  },
  {
    id: "msg.unsolicited-job", severity: "medium", title: "Unsolicited job or earning offer",
    explanation: "Unsolicited work offers that promise quick earnings can lead to advance-fee or task-payment requests.",
    patterns: [
      /\bwork\s+from\s+home\b.{0,40}\b(?:earn|income|salary|per\s+day)\b/i,
      /\bearn\s+(?:₹|rs\.?\s*)?\d[\d,]*\s+per\s+day\b/i,
      /\bpart[- ]time\s+(?:job|work)\s+(?:offer|opening|and\s+earn|with\s+salary)\b/i,
      /\blike\s+and\s+earn\b/i,
    ],
  },
  {
    id: "msg.generic-greeting", severity: "low", title: "Generic greeting",
    explanation: "A generic greeting does not identify a specific relationship. It is common in legitimate bulk messages too.",
    patterns: [/\bdear\s+(?:customer|user|sir|madam)\b/i],
  },
  {
    id: "msg.forward-pressure", severity: "medium", title: "Pressure to forward or spread the message",
    explanation: "Requests to forward a message widely can spread unverified claims without showing their original source.",
    patterns: [
      /\bforward\s+(?:this\s+)?to\s+\d+\s+(?:people|friends|groups)\b/i,
      /\bshare\s+(?:this\s+)?with\s+everyone\b/i,
      /\bsend\s+(?:this\s+)?to\s+all\s+groups\b/i,
    ],
  },
  {
    id: "msg.contact-switch", severity: "low", title: "Request to change contact channel",
    explanation: "A request to move a conversation or call a number can shift it away from a channel where the sender is easier to check.",
    patterns: [
      /\b(?:move|switch|continue)\s+(?:this\s+)?(?:conversation|chat)?\s*(?:to|on)\s+(?:whatsapp|telegram)\b/i,
      /\b(?:message|chat|contact)\s+(?:(?:me|us|the\s+team)\s+)?(?:on|via|through)\s+(?:whatsapp|telegram)\b/i,
      /\bcall\s+(?:me|us|this\s+number|the\s+number)\b/i,
    ],
  },
];

const ORGANIZATION_MENTION = /\b(?:your\s+(?:sbi|hdfc(?:\s+bank)?|icici(?:\s+bank)?|axis(?:\s+bank)?|bank|aadhaar|uidai)(?:\s+(?:account|card|service|kyc))?|(?:sbi|hdfc\s+bank|icici\s+bank|axis\s+bank|paytm|phonepe|bank|government|police|courier|india\s+post|delivery\s+(?:company|service)|telecom|mobile\s+provider|employer|customer\s+(?:care|support)|aadhaar|uidai)\s+(?:alert|notice|message|account|security|support|care|service|verification|kyc)|india\s+post|(?:we\s+are|this\s+is|message\s+from|calling\s+from)\s+(?:your\s+|the\s+)?(?:bank|sbi|hdfc(?:\s+bank)?|icici(?:\s+bank)?|axis(?:\s+bank)?|paytm|phonepe|government|police|courier|india\s+post|delivery\s+(?:company|service)|telecom|mobile\s+provider|employer|customer\s+(?:care|support)|aadhaar|uidai))\b/gi;
const ACTION_REQUEST = /\b(?:please\s+)?(?:click(?:\s+the)?\s+(?:link|here)|verify\s+(?:your\s+)?(?:account|kyc|details|identity)|update\s+(?:your\s+)?(?:account|kyc|details)|confirm\s+(?:your\s+)?(?:account|details)|complete\s+(?:your\s+)?(?:kyc|verification)|reply\s+(?:with|to)|contact\s+(?:us|me|support)|call\s+(?:us|this\s+number))\b/i;
const LINK_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+|\b(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:\/[^\s<>"'`]*)?(?:\?[^\s<>"'`]*)?(?:#[^\s<>"'`]*)?/gi;

function extractUrls(text: string): UrlMatch[] {
  const matches: UrlMatch[] = [];
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0;
    if (start > 0 && text[start - 1] === "@") continue; // Avoid treating an email domain as a link.
    let value = match[0];
    while (/[.,!?;:)}\]]$/.test(value)) value = value.slice(0, -1);
    if (!value) continue;
    matches.push({ value, start, end: start + value.length });
  }
  return matches;
}

function collectRuleIndicators(text: string): Indicator[] {
  const indicators: Indicator[] = [];
  for (const rule of MESSAGE_RULES) {
    const matches: Array<{ evidence: string; start: number }> = [];
    for (const pattern of rule.patterns) {
      const globalPattern = new RegExp(pattern.source, `${pattern.ignoreCase ? "i" : ""}g`);
      for (const match of text.matchAll(globalPattern)) {
        matches.push({ evidence: match[0], start: match.index ?? 0 });
      }
    }
    matches.sort((left, right) => left.start - right.start || right.evidence.length - left.evidence.length);

    let lastEnd = -1;
    for (const match of matches) {
      const end = match.start + match.evidence.length;
      if (match.start < lastEnd) continue;
      indicators.push({
        id: rule.id,
        category: "message",
        severity: rule.severity,
        title: rule.title,
        explanation: rule.explanation,
        evidence: match.evidence,
        span: { start: match.start, end },
      });
      lastEnd = end;
      if (indicators.filter((indicator) => indicator.id === rule.id).length >= 3) break;
    }
  }
  return indicators;
}

function addFormattingIndicator(text: string, indicators: Indicator[]): void {
  const exclamations = /!{4,}/g;
  const match = exclamations.exec(text);
  if (match) {
    indicators.push({
      id: "msg.excess-formatting", category: "message", severity: "low",
      title: "Unusually emphatic formatting",
      explanation: "Repeated capital letters or punctuation can be used to create urgency, but may also be a sender's ordinary style.",
      evidence: match[0], span: { start: match.index, end: match.index + match[0].length },
    });
    return;
  }

  if (text.length <= 30) return;
  const letters = text.match(/[a-z]/gi) ?? [];
  const uppercase = text.match(/[A-Z]/g) ?? [];
  if (letters.length > 0 && uppercase.length / letters.length > 0.4) {
    indicators.push({
      id: "msg.excess-formatting", category: "message", severity: "low",
      title: "Unusually emphatic formatting",
      explanation: "Repeated capital letters or punctuation can be used to create urgency, but may also be a sender's ordinary style.",
      evidence: text,
      span: { start: 0, end: text.length },
    });
  }
}

function addImpersonationIndicator(text: string, indicators: Indicator[], hasUrl: boolean): void {
  const hasRequest = indicators.some((indicator) =>
    indicator.id === "msg.credential-request" || indicator.id === "msg.payment-request",
  ) || ACTION_REQUEST.test(text);
  if (!hasUrl && !hasRequest) return;

  ORGANIZATION_MENTION.lastIndex = 0;
  const match = ORGANIZATION_MENTION.exec(text);
  if (!match) return;
  indicators.push({
    id: "msg.impersonation", category: "message", severity: "medium",
    title: "Claims to speak for an organization",
    explanation: "A message can claim to represent an organization. A link or request in the same message makes it useful to confirm the sender through a separate official channel.",
    evidence: match[0], span: { start: match.index, end: match.index + match[0].length },
  });
}

function addCombinationIndicator(text: string, indicators: Indicator[]): void {
  const request = indicators.find((indicator) =>
    indicator.id === "msg.credential-request" || indicator.id === "msg.payment-request",
  );
  const context = indicators.find((indicator) =>
    indicator.id === "msg.urgency" || indicator.id === "msg.impersonation",
  );
  if (!request || !context || !request.span || !context.span) return;

  const start = Math.min(request.span.start, context.span.start);
  const end = Math.max(request.span.end, context.span.end);
  indicators.push({
    id: "msg.combo-pattern", category: "message", severity: "info",
    title: "Combination often used in scams",
    explanation: "This message combines a request for money or sensitive information with urgency or an organizational claim. The combination is a reason to verify independently, not a verdict.",
    evidence: text.slice(start, end),
    span: { start, end },
  });
}

/** Analyze message text and any embedded links locally; never fetches a link. */
export function analyzeMessage(text: string): { indicators: Indicator[]; urls: string[] } {
  if (typeof text !== "string") {
    return {
      indicators: [{
        id: "msg.could-not-analyze", category: "message", severity: "info",
        title: "Could not analyze this message", explanation: "Message input must be text.", evidence: "",
        span: { start: 0, end: 0 },
      }],
      urls: [],
    };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return {
      indicators: [{
        id: "msg.input-too-long", category: "message", severity: "info",
        title: "Message exceeds the local analysis limit",
        explanation: `This message is longer than ${MAX_TEXT_LENGTH.toLocaleString()} characters. Only the first ${MAX_TEXT_LENGTH.toLocaleString()} characters are checked.`,
        evidence: text.slice(0, 100), span: { start: 0, end: 100 },
      }],
      urls: [],
    };
  }

  const matches = extractUrls(text);
  const scannedMatches = matches.slice(0, MAX_URLS);
  const indicators = collectRuleIndicators(text);
  addFormattingIndicator(text, indicators);

  for (const link of scannedMatches) {
    const { indicators: urlIndicators } = analyzeUrl(link.value);
    for (const indicator of urlIndicators) {
      const localSpan = indicator.span;
      indicators.push({
        ...indicator,
        ...(localSpan ? { span: { start: link.start + localSpan.start, end: link.start + localSpan.end } } : {}),
      });
    }
  }

  addImpersonationIndicator(text, indicators, scannedMatches.length > 0);
  addCombinationIndicator(text, indicators);

  if (matches.length > MAX_URLS) {
    const omitted = matches[MAX_URLS];
    indicators.push({
      id: "msg.url-limit", category: "message", severity: "info",
      title: "Additional links were not checked",
      explanation: `Only the first ${MAX_URLS} links in a message are analyzed locally.`,
      evidence: omitted.value, span: { start: omitted.start, end: omitted.end },
    });
  }

  return { indicators, urls: scannedMatches.map((link) => link.value) };
}
