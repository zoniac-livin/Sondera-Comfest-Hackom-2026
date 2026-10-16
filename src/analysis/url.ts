import { KNOWN_BRANDS, type KnownBrand } from "./brands";
import type { Indicator, ParsedUrl, Severity } from "../types";

const MAX_URL_LENGTH = 20_000;
const MULTIPART_TLDS = new Set(["co.uk", "co.in", "com.au", "org.in", "gov.in", "ac.in"]);
const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy",
  "ow.ly", "shorturl.at", "tiny.cc",
]);
const RISKY_TLDS = new Set([
  "zip", "mov", "top", "xyz", "click", "gq", "tk", "ml", "cf", "ga", "work", "support",
]);
const KEYWORDS = /login|verify|update|secure|account|confirm|otp|kyc/i;
const REDIRECT_KEYS = new Set(["url", "redirect", "next", "continue"]);

type AnalysisResult = { parsed: ParsedUrl | null; indicators: Indicator[] };

function makeIndicator(
  raw: string,
  id: string,
  severity: Severity,
  title: string,
  explanation: string,
  evidence: string,
): Indicator {
  let exactEvidence = evidence;
  let start = exactEvidence ? raw.indexOf(exactEvidence) : -1;
  if (start < 0 && exactEvidence) {
    start = raw.toLowerCase().indexOf(exactEvidence.toLowerCase());
    if (start >= 0) exactEvidence = raw.slice(start, start + exactEvidence.length);
  }
  return {
    id,
    category: "url",
    severity,
    title,
    explanation,
    evidence: exactEvidence,
    ...(start >= 0 ? { span: { start, end: start + exactEvidence.length } } : {}),
  };
}

function failure(raw: string, reason: string): AnalysisResult {
  const indicator = makeIndicator(
    raw,
    "url.could-not-parse",
    "info",
    "Could not parse this address",
    reason,
    raw.slice(0, 100),
  );
  return {
    parsed: null,
    indicators: [{ ...indicator, span: indicator.span ?? { start: 0, end: 0 } }],
  };
}

function hasExplicitScheme(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) || /^(?:javascript|data):/i.test(value);
}

function getRawHostname(value: string): string {
  const authority = value.match(/^(?:[a-z][a-z\d+.-]*:\/\/)?([^/?#]*)/i)?.[1] ?? "";
  const afterCredentials = authority.slice(authority.lastIndexOf("@") + 1);
  if (afterCredentials.startsWith("[")) {
    const close = afterCredentials.indexOf("]");
    return close >= 0 ? afterCredentials.slice(0, close + 1) : afterCredentials;
  }
  return afterCredentials.replace(/:\d*$/, "");
}

function guessRegistrableDomain(hostname: string): { registrableDomain: string; subdomains: string[] } {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length < 2 || host.startsWith("[") || isIpAddress(host)) {
    return { registrableDomain: host, subdomains: [] };
  }

  const lastTwo = labels.slice(-2).join(".");
  const domainLabels = MULTIPART_TLDS.has(lastTwo) ? 3 : 2;
  return {
    registrableDomain: labels.slice(-domainLabels).join("."),
    subdomains: labels.slice(0, -domainLabels),
  };
}

function isIpAddress(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (/^\[.*:.*\]$/.test(host)) return true;
  const parts = host.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function isOfficialDomain(domain: string, brand: KnownBrand): boolean {
  return brand.officialDomains.some((official) => domain === official || domain.endsWith(`.${official}`));
}

function editDistanceAtMostOne(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) i += 1;
    else if (right.length > left.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + Number(i < left.length || j < right.length) <= 1;
}

function isLookalikeLabel(candidate: string, brand: string): boolean {
  const label = candidate.toLowerCase();
  const name = brand.toLowerCase();
  if (label !== name && editDistanceAtMostOne(label, name)) return true;

  // Treat rn→m and vv→w as one visually plausible substitution each, while
  // still allowing no more than one total edit in the candidate label.
  return (label.includes("rn") && label.replace("rn", "m") === name)
    || (label.includes("vv") && label.replace("vv", "w") === name);
}

function findBrandEvidence(raw: string, values: string[], brand: string): string | undefined {
  const brandPattern = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  for (const value of values) {
    const match = value.match(brandPattern);
    if (match?.[0]) {
      const rawMatch = raw.match(new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      return rawMatch?.[0] ?? match[0];
    }
  }
  return undefined;
}

function hasUrlValue(value: string): boolean {
  if (!value) return false;
  try {
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `http://${value}`;
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname.includes(".") || parsed.hostname.startsWith("["));
  } catch {
    return false;
  }
}

function parsedDetails(url: URL): ParsedUrl {
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const { registrableDomain, subdomains } = guessRegistrableDomain(hostname);
  return {
    protocol: url.protocol,
    hostname,
    registrableDomain,
    subdomains,
    path: url.pathname,
    queryKeys: Array.from(new Set(Array.from(url.searchParams.keys()))),
    port: url.port,
  };
}

/** Analyze a URL string locally. This function never fetches or opens the address. */
export function analyzeUrl(raw: string): AnalysisResult {
  const indicators: Indicator[] = [];
  if (typeof raw !== "string") return failure("", "The address must be text.");
  const value = raw.trim();
  if (!value) return failure(raw, "Enter an address to inspect.");
  if (value.length > MAX_URL_LENGTH) {
    return failure(raw, `The address is longer than the ${MAX_URL_LENGTH.toLocaleString()} character limit.`);
  }

  const explicitScheme = hasExplicitScheme(value);
  let url: URL;
  try {
    url = new URL(explicitScheme ? value : `http://${value}`);
  } catch {
    return failure(raw, "The address format is incomplete or malformed. No network request was made.");
  }

  const parsed = parsedDetails(url);
  const scheme = url.protocol.toLowerCase();
  const host = parsed.hostname;
  const rawHost = getRawHostname(value);

  if (scheme === "javascript:" || scheme === "data:") {
    indicators.push(makeIndicator(
      raw, "url.data-or-js-scheme", "high", "Active or embedded content scheme",
      "This address uses a script or embedded-data scheme rather than a usual web address. Sondera does not execute it.",
      value.slice(0, Math.min(value.length, 80)),
    ));
    return { parsed, indicators };
  }

  if (isIpAddress(host)) {
    indicators.push(makeIndicator(raw, "url.ip-host", "high", "Address uses an IP number", "An IP address can make it harder to recognize who operates a site. This alone does not establish intent.", rawHost || host));
  }

  const hostLabels = host.split(".");
  const punycodeLabel = hostLabels.find((label) => label.startsWith("xn--"));
  if (punycodeLabel) {
    const evidence = /xn--/i.test(rawHost) ? punycodeLabel : rawHost;
    indicators.push(makeIndicator(raw, "url.punycode", "medium", "Punycode label in address", "Internationalized domain names can be used legitimately, but encoded labels can also make lookalike names harder to notice.", evidence));
  }
  if ([...rawHost].some((character) => character.codePointAt(0)! > 127)) {
    indicators.push(makeIndicator(raw, "url.non-ascii", "medium", "Non-ASCII hostname characters", "Non-ASCII characters may be used legitimately, but some can resemble Latin letters in a domain name.", rawHost));
  }

  if (url.username || url.password) {
    const credentials = value.match(/[^/?#]*@/)?.[0] ?? `${url.username}${url.password ? `:${url.password}` : ""}@`;
    indicators.push(makeIndicator(raw, "url.userinfo", "high", "Credentials before the host", "Text before @ can make the address appear to belong to a different organization. Check which hostname follows the @ sign.", credentials));
  }

  if (parsed.subdomains.length >= 4) {
    indicators.push(makeIndicator(raw, "url.many-subdomains", "medium", "Many subdomain levels", "Several subdomains can make the main domain harder to spot. Read the address from right to left to identify its registrable domain.", parsed.subdomains.join(".")));
  }

  const outsideRegistrableDomain = parsed.subdomains.join(".");
  const pathAndQuery = `${url.pathname}${url.search}`;
  for (const brand of KNOWN_BRANDS) {
    if (parsed.registrableDomain.includes(brand.name)) continue;
    const evidence = findBrandEvidence(raw, [outsideRegistrableDomain, pathAndQuery], brand.name);
    if (evidence) {
      indicators.push(makeIndicator(raw, "url.brand-in-subdomain", "high", "Brand name outside the main domain", `The text “${brand.name}” appears in a subdomain or path, while the registrable domain is ${parsed.registrableDomain}. Names in a path do not identify who controls the domain.`, evidence));
      break;
    }
  }

  const registrableLabel = parsed.registrableDomain.split(".")[0] ?? "";
  const lookalikeBrand = KNOWN_BRANDS.find((brand) =>
    brand.name.length >= 5
    && !isOfficialDomain(parsed.registrableDomain, brand)
    && isLookalikeLabel(registrableLabel, brand.name),
  );
  if (lookalikeBrand) {
    indicators.push(makeIndicator(raw, "url.lookalike-brand", "high", "Domain resembles a known brand", `The domain label is one small spelling or common character-substitution change from “${lookalikeBrand.name}”. Similar spelling is a clue to inspect, not proof of who operates the site.`, registrableLabel));
  }

  if (SHORTENERS.has(parsed.registrableDomain)) {
    indicators.push(makeIndicator(raw, "url.shortener", "medium", "Link shortener hides the destination", "A shortened link does not show its final destination in the address. This check does not expand or visit the link.", parsed.registrableDomain));
  }

  const domainLabels = parsed.registrableDomain.split(".");
  const tld = domainLabels[domainLabels.length - 1] ?? "";
  if (RISKY_TLDS.has(tld)) {
    indicators.push(makeIndicator(raw, "url.risky-tld", "low", "Less common top-level domain", "This top-level domain is sometimes abused, but many legitimate sites use it too.", `.${tld}`));
  }
  const hyphenCount = (registrableLabel.match(/-/g) ?? []).length;
  if (hyphenCount >= 3) {
    indicators.push(makeIndicator(raw, "url.hyphen-heavy", "low", "Several hyphens in the main domain", "Several hyphens can make a domain harder to read. This is only a naming observation.", registrableLabel));
  }
  if (host.length > 40) {
    indicators.push(makeIndicator(raw, "url.long-host", "low", "Long hostname", "A long hostname can be harder to inspect at a glance. Length alone does not indicate intent.", rawHost));
  }

  const keyword = pathAndQuery.match(KEYWORDS)?.[0];
  if (keyword) {
    indicators.push(makeIndicator(raw, "url.keyword-path", "info", "Account-related word in path or query", `The path or query contains “${keyword}”. Such words are common on legitimate sites too; this observation is not evidence of a verdict.` , keyword));
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    indicators.push(makeIndicator(raw, "url.nonstandard-port", "low", "Nonstandard port number", "This address specifies a port other than the usual web ports. That can be intentional, but is worth understanding.", `:${url.port}`));
  }

  if (explicitScheme && scheme === "http:") {
    indicators.push(makeIndicator(raw, "url.http-no-tls", "low", "Connection is not encrypted by HTTPS", "HTTP does not encrypt the connection. This describes the connection, not the site's intent.", "http://"));
  }

  for (const [key, queryValue] of url.searchParams.entries()) {
    if (REDIRECT_KEYS.has(key.toLowerCase()) && hasUrlValue(queryValue)) {
      const evidence = value.match(new RegExp(`[?&]${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=[^&#]*`, "i"))?.[0] ?? `${key}=${queryValue}`;
      indicators.push(makeIndicator(raw, "url.redirect-param", "low", "Redirect destination in query", "A query parameter contains another address that may be used as a redirect destination. Sondera does not follow it.", evidence));
      break;
    }
  }

  if (explicitScheme && scheme === "https:") {
    indicators.push(makeIndicator(raw, "url.https-note", "info", "Encrypted connection only", "HTTPS only means the connection is encrypted. Scammers also use HTTPS. It is not a sign the site is genuine.", "https://"));
  }

  return { parsed, indicators };
}
