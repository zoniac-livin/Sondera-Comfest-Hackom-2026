import { describe, expect, it } from "vitest";
import { analyzeUrl } from "./url";

const ids = (value: string) => analyzeUrl(value).indicators.map((indicator) => indicator.id);

describe("analyzeUrl", () => {
  it.each([
    ["ordinary HTTPS site", "https://example.com/about", "url.https-note"],
    ["ordinary subdomain", "https://news.example.com/article", "url.https-note"],
    ["bank IP host", "http://192.168.1.1/login", "url.ip-host"],
    ["IPv6 IP host", "https://[2001:db8::1]/", "url.ip-host"],
    ["brand text in subdomain", "https://paypal.com.secure-login.xyz", "url.brand-in-subdomain"],
    ["single-character digit lookalike", "https://paypa1.com", "url.lookalike-brand"],
    ["rn-to-m lookalike", "https://rnicrosoft.com", "url.lookalike-brand"],
    ["punycode label", "https://xn--pple-43d.com", "url.punycode"],
    ["userinfo @ trick", "https://google.com@evil.com", "url.userinfo"],
    ["shortener", "https://bit.ly/abc", "url.shortener"],
    ["script scheme", "javascript:alert(1)", "url.data-or-js-scheme"],
    ["embedded-data scheme", "data:text/plain,hello", "url.data-or-js-scheme"],
    ["risky top-level domain", "https://news.example.xyz", "url.risky-tld"],
    ["hyphen-heavy domain", "https://secure-account-login-verify.com", "url.hyphen-heavy"],
    ["long hostname", `https://${"a".repeat(42)}.example.com`, "url.long-host"],
    ["keyword path", "https://example.com/account/login", "url.keyword-path"],
    ["nonstandard port", "https://example.com:8443/home", "url.nonstandard-port"],
    ["HTTP transport", "http://example.com/home", "url.http-no-tls"],
    ["redirect parameter", "https://example.com/?next=https%3A%2F%2Fevil.example%2F", "url.redirect-param"],
    ["four subdomain labels", "https://a.b.c.d.example.com", "url.many-subdomains"],
    ["credentials with password", "http://user:pass@example.com", "url.userinfo"],
    ["alternate shortener", "https://tinyurl.com/abc", "url.shortener"],
    ["international hostname", "https://раypal.com", "url.non-ascii"],
  ])("detects %s", (_label, value, expectedId) => {
    expect(ids(value)).toContain(expectedId);
  });

  it.each([
    "https://sbi.co.in",
    "https://www.google.com",
    "https://apple.com/support",
    "https://example.org/article",
    "https://example.com:443/path",
    "http://example.com:80/path",
    "https://example.com/a/b/c",
    "https://secure-login.example.com", // A keyword in a subdomain is not a path/query match.
  ])("does not raise a high indicator for ordinary or official address %s", (value) => {
    expect(analyzeUrl(value).indicators.some((indicator) => indicator.severity === "high")).toBe(false);
  });

  it("adds HTTPS information without reducing any other indicator severity", () => {
    const secure = analyzeUrl("https://paypa1.com/login").indicators;
    const plain = analyzeUrl("http://paypa1.com/login").indicators;
    expect(secure.find((indicator) => indicator.id === "url.lookalike-brand")?.severity).toBe("high");
    expect(plain.find((indicator) => indicator.id === "url.lookalike-brand")?.severity).toBe("high");
    expect(secure.find((indicator) => indicator.id === "url.https-note")?.explanation).toBe(
      "HTTPS only means the connection is encrypted. Scammers also use HTTPS. It is not a sign the site is genuine.",
    );
  });

  it("parses a missing scheme without treating the inferred scheme as an observation", () => {
    const result = analyzeUrl("example.com/path?ref=mail");
    expect(result.parsed).toMatchObject({
      protocol: "http:", hostname: "example.com", registrableDomain: "example.com",
      subdomains: [], path: "/path", queryKeys: ["ref"], port: "",
    });
    expect(ids("example.com/path")).not.toContain("url.http-no-tls");
  });

  it.each(["", "   ", "https://", "http://[broken", "x".repeat(20_001)])(
    "returns a parse information instead of throwing for malformed or oversized input (%s)",
    (value) => {
      expect(() => analyzeUrl(value)).not.toThrow();
      expect(analyzeUrl(value).parsed).toBeNull();
      expect(ids(value)).toContain("url.could-not-parse");
    },
  );

  it("handles trailing dots and uppercase hostnames", () => {
    const trailing = analyzeUrl("https://example.com./path");
    expect(trailing.parsed?.hostname).toBe("example.com");
    const uppercase = analyzeUrl("HTTPS://GOOGLE.COM");
    expect(uppercase.parsed?.registrableDomain).toBe("google.com");
    expect(ids("HTTPS://GOOGLE.COM")).not.toContain("url.lookalike-brand");
    const note = analyzeUrl("HTTPS://GOOGLE.COM").indicators.find((item) => item.id === "url.https-note");
    expect(note?.evidence).toBe("HTTPS://");
    expect("HTTPS://GOOGLE.COM".slice(note!.span!.start, note!.span!.end)).toBe(note?.evidence);
  });

  it("derives registrable-domain guesses for listed multipart suffixes", () => {
    expect(analyzeUrl("https://mail.sbi.co.in").parsed).toMatchObject({
      registrableDomain: "sbi.co.in", subdomains: ["mail"],
    });
  });

  it("limits lookalikes to one edit and to brands with at least five letters", () => {
    expect(ids("https://facccebook.com")).not.toContain("url.lookalike-brand");
    expect(ids("https://rnicrosoft1.com")).not.toContain("url.lookalike-brand");
    expect(ids("https://axiz.com")).not.toContain("url.lookalike-brand");
    expect(ids("https://paypal.xyz")).not.toContain("url.lookalike-brand");
    expect(ids("https://paypa1.com")).toContain("url.lookalike-brand");
  });

  it("keeps keyword-path at info severity so it is excluded from levels", () => {
    const keyword = analyzeUrl("https://example.com/login").indicators.find((indicator) => indicator.id === "url.keyword-path");
    expect(keyword?.severity).toBe("info");
    expect(analyzeUrl("https://example.com/login").indicators.every((indicator) => indicator.severity === "info")).toBe(true);
  });

  it("attaches exact source spans to matched evidence", () => {
    const raw = "https://paypa1.com/login";
    const result = analyzeUrl(raw);
    const indicator = result.indicators.find((item) => item.id === "url.lookalike-brand");
    expect(indicator?.span).toEqual({ start: 8, end: 14 });
    expect(raw.slice(indicator!.span!.start, indicator!.span!.end)).toBe(indicator?.evidence);
  });
});
