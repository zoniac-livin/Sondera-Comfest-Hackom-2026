# SONDERA — Master Build Prompt for Coding Agents (Codex / Antigravity)

Paste this entire file as the first message (with the component code pasted into Appendix A and B at the bottom, or attached as files). Then drive the build one phase at a time (say "Proceed to Phase N" after you have reviewed the previous one). If you ever switch accounts or agents, follow Section 13 (Handoff).

---

## 0. Your role and the rules of engagement

You are a senior full-stack engineer building **Sondera**, a hackathon project for HACKCOM '26 (theme: *Building a Safer Digital World*). The project is due in under 24 hours, so **correctness and polish on a small scope beat breadth**.

Hard rules:

1. **Work in phases.** Complete one phase, run the tests and the dev server, then STOP and report: what you built, how to run it, what is untested, and any deviations. Do not start the next phase until told.
2. **Do not build anything outside the MVP scope** in section 3. Stretch items are listed separately and must not be started unless explicitly requested.
3. **Never claim a feature works unless it has run.** If you could not test something, say so plainly.
4. **No network calls for analysis.** All analysis is local and deterministic. Never fetch, open, resolve, or request a user-supplied URL. Never send user content anywhere.
5. **No paid APIs, no accounts, no backend, no API keys.** Static site only.
6. **Keep code readable.** The team must be able to explain every rule to judges. Prefer small pure functions, clear names, and comments explaining *why* a rule exists.
7. **Treat all user input as untrusted.** Never use `dangerouslySetInnerHTML`, `eval`, or inject user text as HTML. Render as text only. Guard against malformed, huge (cap at 20,000 characters), empty, and unicode-heavy input.
8. **Ask before adding any dependency** beyond the approved list in section 4.
9. **Maintain the handoff.** Keep `HANDOFF.md` current and commit often, exactly as Section 13 says. The owner may be cut off or switch accounts at any moment and a new agent must be able to continue from the files alone.
10. **Follow the design system in Section 6A.** Do not substitute colors, fonts, or generic "AI template" styling.

---

## 1. Product summary

**Sondera — "Know what you know. Find what you don't."**

A privacy-first web app that helps people examine suspicious messages, URLs, and online claims through an *explainable investigation workflow*. It does not issue a verdict as truth. It separates:

- **Observed indicators** — exact, rule-based things found in the input
- **Unknowns** — what could not be checked or verified
- **Next steps** — practical verification actions

and lets the user record evidence, compare dates, and export a **Decision Receipt** report.

### Non-negotiable product principles

- Never say a message or site is "safe", "verified", "genuine", or "legit". Allowed language: "no indicators found by these checks", "indicators found", "could not verify".
- **HTTPS is never evidence of legitimacy.** Never reward it.
- No single indicator is conclusive. Show each as a contributing observation with a plain-English explanation.
- No invented probabilities or fraud scores. Use qualitative levels derived transparently from counted indicators (see 5.4).
- Always disclose what was **not** checked (e.g., live site reputation, domain age, whether the sender is real).
- A visible limitation notice: automated checks can miss threats and can flag legitimate content.

---

## 2. Target users and demo story

Students, families, everyday internet users. The judge demo (3 minutes) is:

1. Click an example scam message (a fake bank/KYC SMS with a suspicious link).
2. See exact triggered indicators with highlighted phrases and explanations.
3. See "Unknowns" and the Missing-Proof questions.
4. Add one evidence note and a date in the Context Clock.
5. Generate and print/export the Decision Receipt.
6. Refresh the page and show the case was autosaved. Click "Delete all my data."

Everything in the MVP must support this flow flawlessly.

---

## 3. Scope

### MVP (build these)

1. Design system (6A), landing page with the Gateway Flow background, app shell, limitation notice
2. Submit screen with example loaders
3. URL analyzer (+ unit tests)
4. Message analyzer (+ unit tests)
5. Findings panel (Observed / Unknowns / Next steps)
6. Missing-Proof Finder (templated, rule-driven)
7. Evidence notes
8. Context Clock
9. Decision Receipt (printable report + Markdown/JSON export)
10. Autosave, restore, and delete-all-data
11. Accessibility and responsive pass
12. `HANDOFF.md` and `docs/AGENT_PROMPT.md` kept current (Section 13)

### Stretch (DO NOT BUILD unless asked)

Trust Debt indicator, Privacy Navigator checklist, Judgment Gym quizzes, redaction preview, Trust Graph, What-If Lab, external reputation lookups. (The app is dark-theme only; there is no light mode.)

### Roadmap-only (UI may show a static "Coming next" card, clearly labelled as not implemented)

Trust Graph, What-If Lab, External reputation checks.

---

## 4. Tech stack (approved)

- **React 18 + TypeScript (strict) + Vite**
- **Tailwind CSS** with a **shadcn-style project structure**: path alias `@` → `src` (set in `vite.config.ts` AND `tsconfig` paths), a `components.json`, and UI primitives in **`src/components/ui/`**. Initialize with the shadcn CLI for Vite (`npx shadcn@latest init`) if it works; if it fails, replicate the structure by hand and tell me. The `src/components/ui/` folder matters because shadcn tooling and the `@/components/ui/...` imports resolve there, and it keeps reusable primitives separate from Sondera-specific components.
- **Fonts, self-hosted:** `@fontsource/anton` (headings) and `@fontsource/alegreya-sans` (body, weights 400/500/700 plus 400 italic). Do NOT load Google Fonts from a CDN.
- **Vitest** for unit tests
- **Dexie** (IndexedDB wrapper) for storage. If it causes trouble, fall back to `localStorage` with a versioned JSON blob and tell me.
- **react-router-dom** only if multiple routes are needed. Prefer a simple tabbed/stepper single page.
- Also approved: `lucide-react` (icons), `clsx`, `tailwind-merge`, `class-variance-authority` (shadcn helpers). No other runtime dependencies without asking. Optional dev deps: ESLint, Prettier, `@testing-library/react`.

Deployment target: static hosting (Vercel or Netlify). Make sure `npm run build` succeeds with zero TypeScript errors.

---

## 5. Functional specification

### 5.1 Data model (TypeScript)

Define these in `src/types.ts`. Adjust names if needed but keep the structure.

```ts
type Severity = "info" | "low" | "medium" | "high";

interface Indicator {
  id: string;              // stable rule id, e.g. "url.ip-host"
  category: "url" | "message";
  severity: Severity;
  title: string;           // short, plain English
  explanation: string;     // why this matters, 1-3 sentences
  evidence: string;        // the exact text/part that matched
  span?: { start: number; end: number }; // position in the original input, for highlighting
}

interface UnavailableCheck {
  id: string;
  title: string;            // e.g. "Domain age and reputation"
  reason: string;           // why it was not performed (privacy / offline / out of scope)
}

interface Analysis {
  inputType: "message" | "url" | "claim";
  analyzedAt: string;       // ISO timestamp
  indicators: Indicator[];
  extractedUrls: ParsedUrl[];
  unavailableChecks: UnavailableCheck[];
  level: "none-found" | "some-indicators" | "multiple-indicators" | "strong-indicators";
  levelExplanation: string; // transparent: states how many and which severities led to it
  missingProof: MissingProofQuestion[];
}

interface EvidenceNote {
  id: string;
  sourceUrl: string;
  title: string;
  accessedOn: string;       // date
  supports: "supports" | "contradicts" | "unclear";
  kind: "direct" | "inference" | "repost";  // repost = copy of another source, not independent
  note: string;
}

interface ContextDates {
  published?: string;
  event?: string;
  received?: string;
  checked: string;          // auto-set to today
}

interface Case {
  id: string;
  createdAt: string;
  updatedAt: string;
  input: string;
  inputType: "message" | "url" | "claim";
  analysis?: Analysis;
  evidence: EvidenceNote[];
  dates: ContextDates;
  userNotes: string;
  revisions: { at: string; summary: string }[];
}
```

### 5.2 URL analyzer (`src/analysis/url.ts`)

Pure function: `analyzeUrl(raw: string): { parsed: ParsedUrl | null; indicators: Indicator[] }`.

Rules:
- Parse using the built-in `URL` constructor. If a string lacks a scheme (e.g. `example.com/path`), try prefixing `http://` for *parsing only*. If parsing fails, return a graceful "could not parse" info indicator rather than throwing.
- **Never fetch or open anything.**
- Extract and expose: protocol, hostname, registrable-domain guess (last two labels, with a small hardcoded list of multi-part TLDs like `co.uk`, `co.in`, `com.au`, `org.in`, `gov.in`, `ac.in`), subdomains, path, query keys, port.

Rules to implement, each with a stable id, severity, explanation, and exact evidence:

| id | trigger | severity |
|---|---|---|
| `url.ip-host` | hostname is an IPv4/IPv6 address | high |
| `url.punycode` | any label starts with `xn--` (possible lookalike/IDN) | medium |
| `url.non-ascii` | hostname contains non-ASCII characters | medium |
| `url.userinfo` | URL contains `user@host` style credentials (the "@ trick") | high |
| `url.many-subdomains` | 4 or more labels before the registrable domain | medium |
| `url.brand-in-subdomain` | a known brand name appears in subdomain/path but not the registrable domain (e.g. `paypal.secure-login.example.com`) | high |
| `url.lookalike-brand` | registrable domain is within edit distance 1-2 of a known brand, or uses common substitutions (`0`→`o`, `1`/`l`/`i`, `rn`→`m`, `vv`→`w`) | high |
| `url.shortener` | domain in a known shortener list (`bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `is.gd`, `cutt.ly`, `rb.gy`, `ow.ly`, `shorturl.at`, `tiny.cc`) | medium (explain: destination hidden) |
| `url.risky-tld` | TLD in a modest list often abused (`zip`, `mov`, `top`, `xyz`, `click`, `gq`, `tk`, `ml`, `cf`, `ga`, `work`, `support`) | low (explain: many legitimate sites also use these) |
| `url.hyphen-heavy` | 3+ hyphens in the registrable domain | low |
| `url.long-host` | hostname longer than 40 characters | low |
| `url.keyword-path` | path/query contains terms like `login`, `verify`, `update`, `secure`, `account`, `confirm`, `otp`, `kyc` | low |
| `url.nonstandard-port` | explicit port other than 80/443 | low |
| `url.http-no-tls` | scheme is `http` | low (explain: lack of encryption, NOT a statement about intent) |
| `url.redirect-param` | query contains `url=`, `redirect=`, `next=`, `continue=` with a URL value | low |
| `url.data-or-js-scheme` | scheme is `javascript:` or `data:` | high |
| `url.https-note` | scheme is `https` | info. Text must say: "HTTPS only means the connection is encrypted. Scammers also use HTTPS. It is not a sign the site is genuine." |

Include a small, clearly commented `KNOWN_BRANDS` list relevant to an Indian and global audience: `google`, `microsoft`, `apple`, `amazon`, `paypal`, `netflix`, `facebook`, `instagram`, `whatsapp`, `sbi`, `hdfc`, `icici`, `axis`, `paytm`, `phonepe`, `gpay`, `flipkart`, `irctc`, `uidai`, `aadhaar`, `incometax`, `epfo`. Official domains map (e.g. `google` → `google.com`, `sbi` → `sbi.co.in`, `incometax` → `incometax.gov.in`) so a match to the real domain does not trigger lookalike rules.

### 5.3 Message analyzer (`src/analysis/message.ts`)

Pure function: `analyzeMessage(text: string): { indicators: Indicator[]; urls: string[] }`.

- Extract URLs with a robust regex (including bare domains like `bit.ly/abc` and `www.x.com`), run each through `analyzeUrl`, and merge indicators.
- Rule families (case-insensitive, multi-word phrases, with a few multilingual/Hinglish cues such as "turant", "abhi", "jaldi", "band ho jayega"):

| id | looks for | severity |
|---|---|---|
| `msg.urgency` | "urgent", "immediately", "within 24 hours", "last chance", "expires today", "act now", "account will be blocked/suspended/closed" | medium |
| `msg.credential-request` | requests for OTP, PIN, CVV, password, card number, Aadhaar/PAN, "share/send/enter your ..." | high |
| `msg.payment-request` | "pay", "transfer", "send money", "gift card", "UPI", "processing fee", "registration fee", "refund fee", crypto/wallet addresses | high |
| `msg.threat` | "legal action", "arrest", "police", "penalty", "disconnected", "blocked" | medium |
| `msg.reward-lure` | "you have won", "lottery", "prize", "cashback", "free gift", "claim now", "selected for" | medium |
| `msg.impersonation` | claims to be a bank, government, courier, telecom, employer, or "customer care/support", especially combined with a link or request | medium |
| `msg.secrecy` | "do not tell anyone", "keep this confidential" | medium |
| `msg.unsolicited-job` | "work from home", "earn per day", "part time", "like and earn" | medium |
| `msg.generic-greeting` | "Dear customer/user/sir/madam" | low |
| `msg.forward-pressure` | "forward to 10 people", "share with everyone", "send to all groups" | medium |
| `msg.excess-formatting` | excessive ALL CAPS ratio (>40% of letters in text longer than 30 chars) or 4+ exclamation marks | low |
| `msg.contact-switch` | asks to move to WhatsApp/Telegram or call a number | low |

Rules:
- Each indicator's `evidence` is the exact matched phrase and `span` points into the original text, so the UI can highlight it.
- Explanations should teach: say *why* scammers use the tactic.
- De-duplicate overlapping matches. Cap indicators of the same id at 3 occurrences.
- Combination note: if `credential-request` or `payment-request` co-occurs with `urgency` or `impersonation`, add an `info` indicator `msg.combo-pattern` explaining that the combination is a common scam shape. Still not a verdict.

### 5.4 Overall level (`src/analysis/level.ts`)

Transparent, deterministic, no probabilities:

- `none-found`: zero indicators above `info`.
- `some-indicators`: 1-2 indicators, all `low`/`medium`.
- `multiple-indicators`: 3+ indicators, or any `high`.
- `strong-indicators`: 2+ `high` indicators, or 1 `high` plus 2+ `medium`.

`levelExplanation` must state the counts, e.g. "2 high and 3 medium indicators were found by 14 local rules." For `none-found`, the wording must be: "These local checks found no indicators. This does not mean the content is genuine or safe." Always append the limitation notice.

### 5.5 Unavailable checks (`src/analysis/unavailable.ts`)

Always list what was not done, with reasons. At minimum: live domain reputation, domain registration age, whether the link destination matches its display text, whether the sender or phone number is genuine, whether the claim is true against independent sources, screenshots/images (no OCR), and attachment scanning.

### 5.6 Missing-Proof Finder (`src/analysis/missingProof.ts`)

Returns an ordered list of `{ id, question, why, suggestedAction }`, driven by what was detected. Examples:

- If a brand/institution is impersonated: "Have you contacted the organization using a phone number or website you already trust (not the one in this message)?"
- If a payment or credential is requested: "Does the organization officially ask for this by message? Check their official site's security or help page."
- If a URL is present: "Does the link's real destination match the official website you would type yourself?" (suggest typing the official address manually).
- If a news-style claim with no source: "Is there an original announcement or primary source (official site, press release, court order, gazette)?"
- If forwarded/viral cues: "Has any independent outlet or official body confirmed this, or are all copies the same forward?"
- If a date is missing: "When was this first published, and does the date apply to now?"
- If a number/statistic is present: "Where does this figure come from?"
- Always include: "Who is the original author, and can you reach them through a separate channel?"

Cap at 6 questions, most relevant first.

### 5.7 Context Clock (`src/analysis/contextClock.ts`)

Inputs: user-entered published, event, received dates; `checked` is today.

Pure function returns warnings such as:
- Published date is more than 12 months before today: "Old content may be recirculated without context."
- Event date after received date, or published after received: "Dates are inconsistent."
- Received long after published (> 90 days): "This arrived long after it was first published; check whether it still applies."
- Missing published date: "No publication date entered; stale or context-stripped content cannot be ruled out."
- Show a simple horizontal timeline of the entered dates.
Never claim certainty; phrase as "worth checking".

### 5.8 Evidence notes

CRUD list. Fields per `EvidenceNote`. Validate `sourceUrl` with the `URL` parser (warn, do not block, if invalid). Show a small summary: counts of supports/contradicts/unclear, and a visible warning when multiple notes are marked `repost`: "Repeated copies are not independent confirmation." Do not fetch the URL.

### 5.9 Decision Receipt (`src/report/`)

A report view with:
1. Title, case id, generated timestamp
2. Original input (truncated at 1,000 characters in the report, with note)
3. **Checks actually performed** (list of rule families run)
4. **Checks not performed** (unavailable checks)
5. **Findings** (indicators grouped by severity, with explanations and evidence)
6. Overall level with its explanation
7. **Evidence references** (user notes)
8. **Unresolved questions** (Missing-Proof list)
9. **Timeline** (Context Clock)
10. Recommended actions (see 5.10)
11. User notes
12. Revision history
13. Limitations statement

Exports: browser print stylesheet (`@media print`) for Save as PDF, **Markdown download**, **JSON download**. Do not include more of the user's content than needed.

### 5.10 Recommended actions

Generic, level-aware guidance, e.g. don't click links, don't share OTP/PIN, contact the organization through its official channel, report to the relevant authority (for India: the national cybercrime portal and helpline 1930; for UPI/bank fraud, contact the bank immediately), block the sender, warn family. Keep wording hedged and non-legal.

### 5.11 Storage (`src/storage/`)

- Autosave on change with a short debounce (500 ms). Show a save-state chip: "Saving…" / "Saved locally at HH:MM" / "Could not save".
- Restore the last case on load.
- Support multiple cases in a simple list (create new, open, delete one) if time permits; at minimum support a single active case plus "New case."
- **"Delete all my data"** button with confirmation; clears IndexedDB/localStorage completely.
- Versioned schema (`schemaVersion`) and validation on load. If stored data is corrupt, show a recovery message and offer to reset instead of crashing.
- Storage failures (private mode, quota) must degrade gracefully with a visible warning.

---

## 6. UI / UX requirements

- Dark-theme only, following the design system in Section 6A exactly. Brand: "Sondera" wordmark (Anton) and the tagline "Know what you know. Find what you don't."
- **Layout:** a stepper or tabs for the user journey: **Submit → Inspect → Investigate → Decide & Document**.
- **Submit:** large textarea, auto-detect type (URL if the trimmed input parses as a single URL, otherwise message; allow manual override including "claim"). Example buttons (at least 6): fake bank KYC SMS, courier delivery fee scam, lottery/prize, job offer scam, a harmless-looking normal message (to show "no indicators" wording and false-negative caveat), and a viral forward with no source.
- **Inspect:** show the input with highlighted matched phrases (accessible: not color-only; use underline plus an icon). Indicator cards sorted by severity with an expandable explanation. Show the level badge and its explanation. A distinct "What we could not check" section.
- **Investigate:** Missing-Proof questions (checkable), Evidence notes, Context Clock.
- **Decide & Document:** recommended actions and the Decision Receipt with export buttons.
- Persistent footer notice: the limitation statement, plus "Your content stays in your browser. Sondera does not send it anywhere."
- Empty states, loading states, and error states for every view.
- Accessibility: semantic HTML, labels on all inputs, visible focus rings, full keyboard navigation, sufficient contrast, `aria-live` for save state and analysis results, severity never conveyed by color alone, respects `prefers-reduced-motion`.
- Responsive from 360px wide up.
- Copy tone: plain, non-alarmist, never accusatory. Avoid jargon; explain terms.

---

## 6A. Design system and landing page

### Direction
A dark, investigative "case file" feel: calm, precise, serious but not scary. It should look designed by a person with a point of view, **not** like a generic AI/SaaS template.

### Palette (mandatory; define as CSS variables and map into the Tailwind theme)

| Token | Hex | Name | Role |
|---|---|---|---|
| `--bg` | `#121a21` | Deep Slate | page background |
| `--surface` | `#1d2b36` | Elevated Slate | cards, panels, inputs, report sheets |
| `--accent` | `#82a880` | Brightened Sage | primary accent: CTAs, focus rings, links, active step |
| `--muted` | `#385468` | Muted Dark Blue | borders, dividers, secondary buttons, subtle fills (NOT for text) |
| `--text` | `#e9fcfc` | Minty White | primary text |

Derived tokens (compute from the above, do not invent new hues): `--text-dim` (Minty White at about 70% opacity), `--border` (`--muted` at about 60%), `--surface-hover` (slightly lighter Elevated Slate).

Severity colors are the only additions allowed, kept desaturated so they sit inside the palette: `info` uses `--text-dim`, `low` uses `--accent`, `medium` amber `#d9b26f`, `high` soft coral `#e2806f`. You may adjust these two hexes for contrast but must tell me. **Severity is always shown with an icon AND a text label, never color alone.** All body text must meet WCAG AA contrast (4.5:1) on `--bg` and `--surface`; verify and report.

### Typography
- **Headings (h1-h3, wordmark, big numbers, step titles): Anton.** Uppercase, slight positive letter-spacing, tight line-height (about 1.05). Anton has a single weight: never apply bold or faux-bold (`font-synthesis: none`).
- **Body, UI text, buttons, inputs, explanations: Alegreya Sans.** Base size 17-18px (its x-height is small), line-height about 1.6, comfortable measure (about 65 characters). Use tabular figures for numbers and dates.
- Fallback stacks: `"Anton", Impact, "Arial Narrow", sans-serif` and `"Alegreya Sans", system-ui, sans-serif`. `font-display: swap`.
- Fluid heading sizes with `clamp()`.

### Anti-"AI slop" rules
- No purple/blue-pink gradients, no neon glows, no glassmorphism everywhere, no emoji as icons, no stock gradient blobs, no centered-everything template layouts, no identical rounded-card grids repeated down the page.
- Use thin 1px `--border` lines, small radii (6-10px), flat surfaces, strong typographic hierarchy, and generous whitespace. Let Anton at large sizes carry the personality.
- Icons: `lucide-react` only, one stroke width throughout.
- Layout should feel like a dossier: labelled sections (small uppercase labels like "OBSERVED", "UNKNOWN", "NEXT STEPS"), ruled dividers, and a visible case reference (e.g. "CASE 0001") in the app header.
- Motion is restrained: 150-250ms transitions, indicator cards fade/slide in with a short stagger, nothing bouncy. Respect `prefers-reduced-motion`.
- Copy is plain and human. No hype words ("revolutionary", "AI-powered", "next-gen").

### Landing page (built in Phase 1B)
Sections, top to bottom:
1. **Hero (full viewport):** the **Gateway Flow** component (Appendix A) as an absolutely positioned background, with a dark vignette/overlay so text always has strong contrast. Content: small label "HACKCOM '26 · BUILDING A SAFER DIGITAL WORLD", the **SONDERA** wordmark in huge Anton, the tagline, one plain sentence of what it does, a primary button "Start an investigation" (Sage background, Deep Slate text), a secondary text link "How it works", and a trust line: "Runs in your browser. What you paste never leaves your device."
2. **How it works:** the four steps (Submit, Inspect, Investigate, Decide and document), each with an icon and one sentence.
3. **What Sondera will not do:** an honest strip: it never calls anything "safe" or "verified", never treats HTTPS as proof, never invents fraud scores, always lists what it could not check.
4. **Three highlights:** Observed indicators with exact evidence; Missing-proof questions; Context clock and Decision Receipt. Vary the layout; do not use three identical cards.
5. **Footer:** limitation notice and a "Roadmap (not yet built)" line that names Trust Graph and What-If Lab as future work.

The "Start an investigation" button opens the app (Submit step). Provide a way back to the landing page. A simple state or hash-based switch is fine; a router is optional.

### Gateway Flow integration (the exact steps)
1. Put the code from **Appendix A** in `src/components/ui/gateway-flow.tsx`. Put the demo from **Appendix B** in `src/components/ui/gateway-flow-demo.tsx` for a quick check only; do not ship the demo in the UI. The `"use client"` directive is harmless in Vite. If Appendix A is empty, STOP and ask me for the code.
2. Make the minimal edits below, each marked with a comment starting `SONDERA:` so they are easy to find:
   - **Palette:** change the dark background from `#000000` to `#121a21`. Change the line color to Minty White at low alpha and the particle color to Brightened Sage inside the embedded canvas script. **Warning:** the component customizes its source with chained `.replace(...)` string patches, and a replace whose search string no longer matches silently does nothing. After changing any string, re-check every `.replace` in `patch()` still matches, and remove or fix the light-mode branch. Use `mode="dark"` only.
   - **No third-party requests:** the embedded HTML loads the Tailwind CDN, Iconify, GSAP, ScrollTrigger, Google Fonts, and avatar images from `cdn.21st.dev`. Only the `#flow-canvas` element is displayed (the component hides everything else), so remove all of those `<script>`, `<link>` and `<img>` tags, AND delete the GSAP/ScrollTrigger lines in the inline script (otherwise it throws before the canvas code runs). Confirm the particle animation still works afterwards. Reason: Sondera promises no third-party requests.
   - Keep `sandbox="allow-scripts"` on the iframe.
3. Usage: render it inside a wrapper with `absolute inset-0 pointer-events-none`, plus `aria-hidden="true"` (it is decorative), e.g. `<GatewayFlow mode="dark" speed={0.6} density={isMobile ? 0.5 : 1} opacity={0.9} className="h-full w-full" />`.
4. If `prefers-reduced-motion` is set, do not render the animation; show a static dark gradient from the palette instead.
5. Unmount it when the user enters the app so it does not consume CPU behind the analysis screens.
6. The hero text must be readable immediately even if the iframe is slow or fails.
7. In your Phase 1B report, state whether any network request is made on the landing page (check the Network tab) and what the result was.

---

## 7. Test requirements

Use Vitest. Required test files and cases (write tests together with the code):

**`url.test.ts`** (at least 25 cases): valid normal URLs produce no high indicators; `http://192.168.1.1/login` → ip-host; `https://paypal.com.secure-login.xyz` → brand-in-subdomain; `https://paypa1.com` and `https://rnicrosoft.com` → lookalike; `https://xn--pple-43d.com` → punycode; `https://google.com@evil.com` → userinfo; shorteners; `javascript:alert(1)`; missing scheme; empty string; whitespace; extremely long string; weird unicode; trailing dots; uppercase host; port numbers; `https://sbi.co.in` must NOT trigger lookalike; `https://www.google.com` must NOT trigger brand-in-subdomain; confirm HTTPS never reduces severity of anything.

**`message.test.ts`** (at least 25 cases): each rule has at least one positive and one negative case; overlapping matches de-duplicate; spans are correct; a benign message ("Lunch at 1? I'll bring the notes.") yields no indicators above info; Hinglish cues; huge input handled; input with 50 URLs doesn't hang; combination rule works.

**`level.test.ts`, `contextClock.test.ts`, `missingProof.test.ts`, `storage.test.ts`** with meaningful edge cases (invalid dates, future dates, corrupt storage JSON, schema version mismatch).

Also create a **fixtures file** `src/fixtures/samples.ts` with 12+ labelled samples (scam, benign, ambiguous). Document in comments that "benign" samples may still be flagged and that the point is to show limitations honestly.

Add npm scripts: `dev`, `build`, `preview`, `test`, `test:watch`, `lint`, `typecheck`. All must pass at the end of each phase.

---

## 8. Project structure

```
sondera/
├── index.html
├── package.json
├── README.md
├── HANDOFF.md                 # live state for agent handoff (Section 13)
├── components.json            # shadcn config
├── docs/
│   └── AGENT_PROMPT.md        # this prompt, saved verbatim in Phase 1
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types.ts
│   ├── analysis/
│   │   ├── url.ts
│   │   ├── message.ts
│   │   ├── level.ts
│   │   ├── missingProof.ts
│   │   ├── contextClock.ts
│   │   ├── unavailable.ts
│   │   ├── brands.ts
│   │   └── index.ts          # analyze(input, type) orchestrator
│   ├── storage/
│   │   ├── db.ts
│   │   └── useCase.ts        # state + autosave hook
│   ├── report/
│   │   ├── ReceiptView.tsx
│   │   ├── toMarkdown.ts
│   │   └── toJson.ts
│   ├── components/
│   │   ├── ui/                # shadcn-style primitives + gateway-flow.tsx
│   │   └── landing/           # hero, how-it-works, highlights, footer
│   ├── fixtures/samples.ts
│   └── styles/
└── src/**/*.test.ts
```

---

## 9. Phased execution plan

After each phase: run `npm run typecheck && npm run test && npm run build`, then report. **Stop and wait.**

**Phase 1: Foundation and handoff setup.** First save this entire prompt verbatim as `docs/AGENT_PROMPT.md`, create `HANDOFF.md` from the template in Section 13.3, and `git init` with a first commit. Then scaffold the project (Vite, React, TS strict, Tailwind, shadcn-style structure with the `@` alias and `src/components/ui/`, Vitest, lint), set up the palette tokens and self-hosted fonts from Section 6A, create `types.ts`, the app shell with the four-step stepper (placeholder panels), footer notice, and README with run instructions. Deliverable: app runs with the correct colors and fonts, one passing smoke test, HANDOFF.md filled in.

**Phase 1B: Landing page.** Build the landing page exactly as described in Section 6A, including the Gateway Flow integration steps, the reduced-motion fallback, mobile density, and the "Start an investigation" navigation into the app. Check it at 360px, 768px and 1280px. Report the network-request check.

**Phase 2: URL engine.** Implement `url.ts`, `brands.ts`, and all URL tests. Report coverage of the rule table and any rule you changed.

**Phase 3: Message engine.** Implement `message.ts`, `level.ts`, `unavailable.ts`, the orchestrator in `analysis/index.ts`, and tests. Include the fixtures file.

**Phase 4: Submit and Inspect UI.** Submit screen with examples, type detection, highlighted input, indicator cards, level badge, unavailable-checks section. Wire to the real engine.

**Phase 5: Investigate.** Missing-Proof Finder, Evidence notes, Context Clock (logic, tests, UI, timeline).

**Phase 6: Storage.** Dexie (or localStorage fallback), autosave with save-state chip, restore, new case, delete-all with confirmation, corruption recovery, tests.

**Phase 7: Decision Receipt.** Report view, print stylesheet, Markdown and JSON export, recommended actions, revision history entries (created, analysis run, evidence added, dates edited).

**Phase 8: Polish and hardening.** Accessibility audit pass, keyboard navigation, responsive checks at 360/768/1280, empty/error states, performance with large inputs, copy review against the product principles in section 1, README with architecture, limitations, and a "Roadmap (not implemented)" section. Run a final grep to confirm there is no `dangerouslySetInnerHTML`, no `fetch(` of user URLs, and no external requests.

**Phase 9: Demo readiness.** Produce `DEMO.md` with the 3-minute script from section 2, a list of the exact example inputs to click, three likely judge questions with short answers, and an honest "what is and isn't implemented" table. Produce deployment steps for Vercel/Netlify.

---

## 10. Definition of done (per phase and overall)

- TypeScript strict, zero type errors; lint clean; all tests pass; production build succeeds.
- No console errors in normal use.
- Malformed input never crashes the app.
- Copy never states or implies safety/verification.
- Every indicator shows its exact evidence and a plain-language reason.
- Unavailable checks are always disclosed.
- Data stays local; there are no outbound requests during analysis and no third-party requests on any page load, including the landing page (verify in the Network tab and tell me how you verified). Fonts are self-hosted.
- Only the Section 6A palette and fonts are used; severity is never color-only.
- `HANDOFF.md` and `docs/AGENT_PROMPT.md` exist, are current, and are committed.
- Features not built are not mentioned in the UI as available.

---

## 11. Reporting format after each phase

Reply with:
1. **Done:** bullet list of what was built.
2. **How to run/verify:** exact commands and what to click.
3. **Test results:** counts and any failures.
4. **Deviations and decisions:** anything you changed from this spec and why.
5. **Known gaps / risks.**
6. **Next phase:** one line, then stop.
7. **Handoff:** confirm `HANDOFF.md` was updated, give the latest commit hash, and remind me to push to the remote repo (give the exact git commands the first time).

---

## 12. Start now

Begin with **Phase 1 only**. Confirm the plan in 5-8 lines, then execute. Do not start Phase 1B or Phase 2 until I say so. Read Section 13 (Handoff) before you begin and follow it from the first commit.


---

## 13. Handoff protocol (mandatory)

The owner may run out of usage on this account and continue on another account or with another agent that has **no memory of this conversation**. `HANDOFF.md` plus this prompt must be enough for a brand-new agent to continue seamlessly and **behave exactly the same way**.

### 13.1 Setup (Phase 1)
- Save this entire prompt verbatim as `docs/AGENT_PROMPT.md` (including appendices). It is the permanent source of truth and stays binding.
- Create `HANDOFF.md` at the repo root from the template in 13.3.
- Run `git init` and commit. Use small commits with messages like `phase-2: url analyzer rules + tests`.

### 13.2 Keeping it current
- Update `HANDOFF.md` at the end of every phase AND after every significant sub-task (each finished module, test suite, or screen). Do not wait for a phase to end, because you can be cut off without warning.
- Commit after each sub-task. Work-in-progress commits are fine.
- If the owner says "handoff", "write handoff", "I'm switching accounts", or anything similar: stop other work, fully update `HANDOFF.md`, commit, then print a short confirmation and the kickoff message from 13.4.
- If you suspect you are near a usage limit (slowdowns, truncation, warnings), do the handoff proactively without being asked.
- A new account cannot see the old workspace. At the end of every phase remind the owner to push to a private remote (for example GitHub) so the next agent can clone. Give the exact commands the first time. If a remote is not possible, tell the owner to download the project folder as a zip.

### 13.3 HANDOFF.md template (all sections required)
1. **Snapshot:** date/time (IST), current phase and sub-task, estimated completion, branch, last commit hash.
2. **Project in one paragraph:** what Sondera is, plus the hackathon deadlines (idea finalization 11:30 AM IST on Oct 16, 2026; project submission 9:30 AM IST on Oct 17, 2026).
3. **How to behave (identical for every agent):** work phase by phase; stop and report after each phase using the Section 11 format; never claim anything works unless it was run; never add scope beyond the MVP; ask before adding dependencies; follow the product principles in Section 1 and the design system in Section 6A; keep `HANDOFF.md` current.
4. **Non-negotiables:** the product principles (never "safe/verified/genuine", HTTPS is not proof, no invented scores, always disclose unchecked items), the privacy rules (local only, no third-party requests, untrusted input), and the palette and fonts.
5. **Phase status table:** every phase (1, 1B, 2-9) marked Done / In progress / Not started, with notes.
6. **File map:** each important file or folder and its purpose.
7. **Decisions and deviations log:** every change from the spec, with the reason and date.
8. **Design in use:** palette tokens and any adjusted severity hexes, fonts, and every `SONDERA:` edit made to `gateway-flow.tsx`.
9. **Commands:** install, dev, test, typecheck, lint, build, and the last known test counts and results.
10. **Verification log:** what was actually run and observed, and what was NOT verified.
11. **Known bugs, gaps and risks.**
12. **Next steps:** the exact next action, then the ordered list after it.
13. **Open questions for the owner.**

### 13.4 Kickoff message (the owner pastes this into the new account)

> You are continuing an in-progress build of Sondera for HACKCOM '26. Before doing anything else, read in this order: (1) `docs/AGENT_PROMPT.md`, the full spec and rules, which are binding; (2) `HANDOFF.md`, the current state; (3) `git log --oneline -20` and `git status`. Then run install, typecheck, test and build and tell me the results. Then summarize in at most 10 lines: current phase, what is done, what is next, and any mismatch between HANDOFF.md and the real code. Do not write new code until I confirm. Behave exactly as the spec says: phase by phase, stop and report after each phase in the Section 11 format, keep `HANDOFF.md` updated, commit often, and remind me to push.

If the repo is not available to the new agent, the owner pastes the contents of `docs/AGENT_PROMPT.md` and `HANDOFF.md` and the agent asks for any missing files rather than guessing.

---

## Appendix A: `gateway-flow.tsx`

Save as `src/components/ui/gateway-flow.tsx` (see Section 6A for the required edits).

```tsx
[OWNER: PASTE THE FULL gateway-flow.tsx CODE HERE]
```

## Appendix B: `demo.tsx`

Save as `src/components/ui/gateway-flow-demo.tsx` (for a quick check only).

```tsx
[OWNER: PASTE THE demo.tsx CODE HERE]
```
