# SONDERA

**Know what you know. Find what you don't.**

Sondera is a privacy-first web app that helps people examine suspicious messages, links and claims through an **explainable investigation workflow**, instead of a one-word "safe / unsafe" verdict. Everything runs in your browser. What you paste never leaves your device.

Built for **HACKCOM '26**, theme: *Building a Safer Digital World*.


---

## Table of contents

1. [The problem](#the-problem)
2. [What Sondera does](#what-sondera-does)
3. [How it works](#how-it-works)
4. [Design principles](#design-principles)
5. [Features in detail](#features-in-detail)
6. [Privacy and security](#privacy-and-security)
7. [Tech stack](#tech-stack)
8. [Quick start](#quick-start)
9. [Scripts](#scripts)
10. [Try the analyzer from the command line](#try-the-analyzer-from-the-command-line)
11. [Project structure](#project-structure)
12. [Testing](#testing)
13. [Accessibility](#accessibility)
14. [Limitations](#limitations)
15. [Roadmap (not implemented)](#roadmap-not-implemented)
16. [How this maps to the HACKCOM '26 brief](#how-this-maps-to-the-hackcom-26-brief)
17. [Team](#team)
18. [AI-assisted development](#ai-assisted-development)
19. [License](#license)

---

## The problem

People constantly receive forwarded messages, urgent payment requests, suspicious links and viral claims with almost no context. Existing checkers often flag a message but do not explain **what triggered the flag**, **what evidence supports it**, or **what to verify next**. Repeated forwarding can make a claim feel trustworthy without adding any independent evidence. And people often expose personal information when they paste suspicious content into online tools for help.

## What Sondera does

Sondera separates three things that most tools blur together:

| | |
|---|---|
| **Observed indicators** | Exact, rule-based things found in the input, each with the matched text and a plain-English explanation of why it matters |
| **Unknowns** | What could **not** be checked (domain age, live reputation, sender identity, whether a claim is true) |
| **Next steps** | Practical verification questions and safety actions the person can take themselves |

It never tells you something is "safe", "verified" or "genuine". A result of *no indicators found* explicitly says that this does not mean the content is genuine.

## How it works

A four-step investigation, like a case file:

1. **Submit.** Paste a message or URL, or load one of 7 built-in examples. The input type (message, URL or claim) is detected automatically and can be overridden.
2. **Inspect.** Local rules run in your browser. Matched phrases are highlighted in the original text, each indicator is shown as a card with severity, explanation and evidence, and a separate section lists what could not be checked.
3. **Investigate.** Work through Missing-Proof questions, record evidence notes, and enter dates in the Context Clock.
4. **Decide and document.** Review recommended actions and generate a **Decision Receipt** you can print to PDF or download as Markdown or JSON.

## Design principles

- **Never claim safety.** The wording avoids "safe", "verified" and "genuine".
- **HTTPS is never proof.** It only means the connection is encrypted. Scammers use HTTPS too.
- **No invented scores.** The overall level is derived transparently from counted indicators and their severities, and the explanation states the counts.
- **No single clue is conclusive.** Every indicator is a reason to check, not a verdict.
- **Always disclose what was not checked.**
- **Untrusted input.** Submitted text and URLs are treated as untrusted and are never rendered as HTML.

## Features in detail

### URL analyzer
Parses URLs with the browser's built-in `URL` parser. **It never opens, fetches or resolves a link.** Rules look at structure and naming, including:

- IP-address hosts, `user@host` ("@ trick") URLs, and `javascript:` / `data:` schemes
- Punycode and non-ASCII hostnames, with lookalike-brand detection
- Lookalike brands (for example `paypa1`, `rnicrosoft`) and brand names inside non-official domains (for example `sbi-rewards.click`) or in subdomains (for example `amazon.in.deals-today.xyz`)
- Link shorteners, unusual top-level domains, many subdomains, hyphen-heavy or very long hosts, non-standard ports, HTTP without TLS, and redirect parameters
- A reference list of about 118 well-known brands with their official domains, so real sites (for example `onlinesbi.sbi`, `netbanking.hdfcbank.com`, `incometax.gov.in`) are not flagged

### Message analyzer
Rule-based checks that require context rather than single keywords, for example urgency, requests for OTPs or other credentials, payment or fee requests, prize and reward lures, unsolicited job offers, organization impersonation together with a request or link, secrecy and forwarding pressure, generic greetings, and requests to move to WhatsApp or Telegram. A combination of risky patterns is described as a *common scam shape*, never as a verdict. Links inside messages are run through the URL analyzer.

### Overall level
Deterministic and explained. Informational observations are excluded. The result is shown as one of: *No indicators found*, *Some indicators*, *Notable indicators*, or *Strong indicators*, together with the counts that led to it.

### Missing-Proof Finder
Templated verification questions chosen by what was detected (for example "Have you contacted the organization using a number or site you already trust?"), each with a *why* and a *suggested action*. They are for the user's own checks. Sondera does not answer them.

### Evidence notes
Record source URLs, titles, access dates, whether a source supports, contradicts or is unclear about a claim, and whether it is a direct source, an inference or a repost. Repeated copies are flagged as not being independent confirmation. Source URLs are validated but **never fetched**.

### Context Clock
Enter publication, event and received dates. Sondera highlights old content that may be recirculating, inconsistent dates, long delays, and a missing publication date, in "worth checking" language, with a simple timeline.

### Decision Receipt
A structured report containing the original input, checks performed, checks not performed, findings, overall level, evidence references, unresolved questions, timeline, recommended actions, notes, revision history and a limitations statement. Export as **Print / Save as PDF** (light-paper print stylesheet), **Markdown**, or **JSON** (schema-versioned).

### Local autosave
The active case autosaves in your browser, restores after a refresh, shows a save-state indicator, and handles corrupt or unsupported saved data with a recovery option. **"Delete all my data"** clears everything.

## Privacy and security

- **Local-first.** All analysis happens in the browser. No account, no backend, no paid API.
- **No outbound requests for analysis.** Links are parsed as text and never visited. Evidence-note URLs are never fetched.
- **No third-party requests.** Fonts are self-hosted.
- **Safe rendering.** No `dangerouslySetInnerHTML` and no `eval`. Input length is capped and malformed input is handled gracefully.
- **User control.** Export and delete-all controls are built in.

## Tech stack

- React and TypeScript (strict) on Vite
- Tailwind CSS with a shadcn-style structure (`src/components/ui`)
- Vitest for unit and component tests
- Browser `localStorage` for versioned local case storage
- Self-hosted fonts via Fontsource: **Anton** (headings) and **Alegreya Sans** (body)
- Design: dark "case file" theme, palette `#121a21` / `#1d2b36` / `#82a880` / `#385468` / `#e9fcfc`

## Quick start

**Requirements:** Node.js 20 or newer.

```bash
git clone https://github.com/zoniac-livin/Comfest-Hackom-2026.git
cd Comfest-Hackom-2026
npm install
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173/`). If that port is busy, Vite picks the next free one.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Run the TypeScript compiler |
| `npm run lint` | Run ESLint |
| `npm run analyze -- "<text or url>"` | Print the analysis of any input as JSON |

## Try the analyzer from the command line

```bash
npm run analyze -- "Dear customer, your SBI account will be blocked today. Update KYC immediately at http://sbi-kyc-update.top/login and share the OTP."
npm run analyze -- "https://paypa1.com/login"
npm run analyze -- "Lunch at 1? I'll bring the notes."
```

The output lists each indicator with its rule id, severity, explanation, exact matched text and position, plus the overall level and the checks that were not performed.

## Project structure

```
.
├── src/
│   ├── analysis/        # URL and message rules, brand list, level logic, Missing-Proof, Context Clock
│   ├── report/          # Decision Receipt: Markdown and JSON generators
│   ├── components/      # UI, including components/ui primitives
│   ├── fixtures/        # Labelled sample inputs used by examples and tests
│   ├── types.ts         # Shared data model
│   └── styles.css       # Design tokens and global styles
├── scripts/analyze.mjs  # Command-line analyzer
├── docs/AGENT_PROMPT.md # The build specification used during development
├── HANDOFF.md           # Development state notes
└── README.md
```

Folder contents may evolve; browse `src/` for the current layout.

## Testing

The suite covers URL parsing and rules (including legitimate sites that must not be flagged), message rules with benign counter-examples, overall-level logic, Missing-Proof and Context Clock edge cases (invalid and future dates), local-storage failure modes (corrupt data, version mismatch, storage errors), and Decision Receipt export (truncation, empty evidence, special characters). Run it with `npm run test`.

## Accessibility

Semantic HTML, labelled inputs, visible focus rings, keyboard navigation across all four steps, live announcements for analysis results and save state, severity always shown with an icon **and** a text label (never color alone), reduced-motion support, and contrast checked against WCAG AA.

## Limitations

Sondera is honest about what it cannot do.

- It does **not** prove that a message is genuine or that a website is safe.
- Rule-based checks can **miss threats** and can **flag legitimate content**. For example, a scam hosted on a clean-looking domain (such as `fastdeals-support.com`) will show no indicators, because no offline tool can judge that from the address alone. This is why Sondera lists what it could not check and offers verification questions.
- It does not query domain age, live reputation or sender identity, does not read images or attachments (no OCR), and does not check claims against outside sources.
- Brand coverage is a curated list, not the whole internet.

## Roadmap (not implemented)

These ideas appear in the original proposal but are **not built** and are not claimed as features:

- **Trust Graph:** connect messages, claims, sources and observations in one case
- **What-If Lab:** explore labelled evidence scenarios and see what changes
- **Trust Debt:** flag when circulation has grown without independent evidence
- **Privacy Navigator and Judgment Gym:** privacy checklist and short learning scenarios
- **Redaction preview** before exporting a report
- **Optional external reputation lookups,** with clear disclosure of data handling
- **Landing page** with an animated background

## How this maps to the HACKCOM '26 brief

| Brief direction | Sondera |
|---|---|
| Assess the reliability of articles, claims and viral messages by examining sources and highlighting claims that need verification | Evidence notes (direct vs inference vs repost), Context Clock, Missing-Proof Finder |
| Educate users about scams, suspicious messages, phishing and fraudulent websites; analyze submitted messages; explain warning signs; recommend safety measures | URL and message analyzers with explained rules, example scams, recommended actions in the Decision Receipt |
| Help individuals understand and protect their personal information | Privacy-first, local-only design, export and delete controls, and guidance on what not to share (OTPs, PINs, passwords) |

## Team

| Name | Role |
|---|---|
| `<name>` | `<role>` |
| `<name>` | `<role>` |

Team name: `<team name>`

## AI-assisted development

This project was built with AI coding assistance (OpenAI Codex), working phase by phase from a written specification (`docs/AGENT_PROMPT.md`) and a running handoff log (`HANDOFF.md`). The team ran, tested and reviewed the results of each phase. `<edit this section to match the hackathon's disclosure rules and your actual process>`

## License

See the [`LICENCE`](./LICENCE) file.
