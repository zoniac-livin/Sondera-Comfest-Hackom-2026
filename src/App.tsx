import {
  AlertCircle, ArrowLeft, ArrowRight, CircleAlert, CircleHelp,
  Info, LockKeyhole, MessageSquareText, ShieldAlert,
  ShieldCheck, TriangleAlert, type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { analyze } from "@/analysis";
import { analyzeUrl } from "@/analysis/url";
import { Stepper } from "@/components/ui/stepper";
import type { Analysis, Indicator, InputType, Severity } from "@/types";

type TypeChoice = "auto" | InputType;

const steps = [
  { name: "Submit", detail: "Share a message or link" },
  { name: "Inspect", detail: "Review what was observed" },
  { name: "Investigate", detail: "Coming later" },
  { name: "Decide & document", detail: "Coming later" },
];

const examples = [
  {
    label: "Bank KYC text",
    text: "SBI ALERT: Your account will be blocked today. Complete KYC now and share your OTP at https://sbi-kyc-update.top/verify",
  },
  {
    label: "Courier fee",
    text: "Your parcel is held for delivery. Please pay a processing fee of ₹25 at https://parcel-release.xyz/pay",
  },
  {
    label: "Prize message",
    text: "You have won a prize! Claim your reward now at https://winner-gift.top/claim",
  },
  {
    label: "Job offer",
    text: "Work from home and earn ₹5,000 per day. Like and earn today. Send a registration fee to get started.",
  },
  {
    label: "Normal message",
    text: "Lunch at 1? I'll bring the notes. See you near the library!",
  },
  {
    label: "Viral forward",
    text: "Forward this to 10 people! A message says schools will close tomorrow, but it doesn't name a source.",
  },
];

const severityMeta: Record<Severity, { label: string; Icon: LucideIcon; className: string }> = {
  high: { label: "High", Icon: ShieldAlert, className: "severity-high" },
  medium: { label: "Medium", Icon: TriangleAlert, className: "severity-medium" },
  low: { label: "Low", Icon: CircleAlert, className: "severity-low" },
  info: { label: "Info", Icon: Info, className: "severity-info" },
};

const levelMeta: Record<Analysis["level"], { label: string; Icon: LucideIcon; className: string }> = {
  "none-found": { label: "No indicators found", Icon: ShieldCheck, className: "level-none" },
  "some-indicators": { label: "Some indicators", Icon: CircleAlert, className: "severity-low" },
  "multiple-indicators": { label: "Multiple indicators", Icon: TriangleAlert, className: "severity-medium" },
  "strong-indicators": { label: "Strong indicators", Icon: ShieldAlert, className: "severity-high" },
};

function detectType(input: string): InputType {
  const value = input.trim();
  return value && !/\s/.test(value) && analyzeUrl(value).parsed ? "url" : "message";
}

function sortedIndicators(indicators: Indicator[]): Indicator[] {
  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 };
  return indicators
    .map((indicator, index) => ({ indicator, index }))
    .sort((left, right) => rank[left.indicator.severity] - rank[right.indicator.severity] || left.index - right.index)
    .map(({ indicator }) => indicator);
}

interface TextPart { text: string; indicators: Indicator[] }

function highlightParts(text: string, indicators: Indicator[]): TextPart[] {
  const matches = indicators.flatMap((indicator) => {
    const span = indicator.span;
    if (!span || span.start < 0 || span.end <= span.start || span.end > text.length) return [];
    return [{ start: span.start, end: span.end, indicator }];
  });
  const boundaries = Array.from(new Set([0, text.length, ...matches.flatMap(({ start, end }) => [start, end])])).sort((a, b) => a - b);
  return boundaries.slice(0, -1).flatMap((start, index) => {
    const end = boundaries[index + 1];
    if (end <= start) return [];
    return [{
      text: text.slice(start, end),
      indicators: matches.filter((match) => match.start < end && match.end > start).map(({ indicator }) => indicator),
    }];
  });
}

function HighlightedInput({ text, indicators }: { text: string; indicators: Indicator[] }) {
  return (
    <p className="input-evidence" aria-label="Original input with matched phrases underlined">
      {highlightParts(text, indicators).map((part, index) => part.indicators.length ? (
        <span className="evidence-mark" key={`${index}-${part.text}`}>
          {part.text}<AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      ) : <span key={`${index}-${part.text}`}>{part.text}</span>)}
    </p>
  );
}

function SeverityLabel({ severity }: { severity: Severity }) {
  const { label, Icon, className } = severityMeta[severity];
  return <span className={`severity-label ${className}`}><Icon size={15} strokeWidth={2} aria-hidden="true" />{label}</span>;
}

function IndicatorCard({ indicator, index }: { indicator: Indicator; index: number }) {
  return (
    <details className="indicator-card" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <summary>
        <SeverityLabel severity={indicator.severity} />
        <span className="indicator-title">{indicator.title}</span>
        <span className="expand-cue">Details <ArrowRight size={14} aria-hidden="true" /></span>
      </summary>
      <div className="indicator-detail">
        <p>{indicator.explanation}</p>
        <div className="matched-evidence"><span className="field-label">MATCHED PHRASE</span><q>{indicator.evidence}</q></div>
      </div>
    </details>
  );
}

export default function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [input, setInput] = useState("");
  const [typeChoice, setTypeChoice] = useState<TypeChoice>("auto");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [formError, setFormError] = useState("");
  const inferredType = useMemo(() => detectType(input), [input]);

  const runAnalysis = () => {
    if (!input.trim()) {
      setFormError("Paste a message, link, or claim first.");
      return;
    }
    const result = analyze(input, typeChoice === "auto" ? inferredType : typeChoice);
    setAnalysis(result);
    setFormError("");
    setActiveStep(1);
  };

  const loadExample = (text: string) => {
    setInput(text);
    setTypeChoice("auto");
    setAnalysis(null);
    setFormError("");
  };

  const editInput = () => {
    setAnalysis(null);
    setActiveStep(0);
  };

  return (
    <div className="app-shell min-h-screen bg-bg font-body text-text antialiased">
      <header className="topbar">
        <a className="wordmark" href="#submit" aria-label="Sondera — start an investigation">SONDERA<span className="wordmark-mark">/</span></a>
        <p className="header-tagline">Know what you know. <span>Find what you don’t.</span></p>
        <div className="case-ref"><LockKeyhole size={14} aria-hidden="true" /><span>PRIVATE WORKSPACE</span><span className="case-number">CASE 0001</span></div>
      </header>

      <main id="submit">
        <div className="page-heading">
          <div className="eyebrow"><span className="eyebrow-rule" /> LOCAL MESSAGE & LINK CHECKS</div>
          <h1>{activeStep === 0 ? <>Start with what<br /><span>you received.</span></> : <>Review what<br /><span>was observed.</span></>}</h1>
          <p className="page-intro">Examine a message or link with clear, local checks. See matched phrases, what remains unknown, and what to consider next.</p>
        </div>

        <section className="workspace" aria-label="Investigation workspace">
          <div className="workspace-heading">
            <div><span className="section-kicker">INVESTIGATION FILE</span><h2>{activeStep === 0 ? "Submit an item" : "Inspection notes"}</h2></div>
            <span className="file-tag">NO. 0001 <MessageSquareText size={15} aria-hidden="true" /></span>
          </div>
          <Stepper steps={steps} activeIndex={activeStep} />

          {activeStep === 0 && (
            <section className="submit-panel" aria-labelledby="submit-title">
              <div className="panel-label-row"><div><span className="panel-kicker">STEP 01 / 04</span><h3 id="submit-title">What would you like to inspect?</h3></div><span className="local-tag"><LockKeyhole size={14} aria-hidden="true" /> STAYS ON THIS DEVICE</span></div>
              <label className="field-label" htmlFor="input-content">MESSAGE, LINK OR CLAIM</label>
              <textarea
                id="input-content"
                className="input-area"
                value={input}
                maxLength={20_000}
                onChange={(event) => { setInput(event.target.value); setAnalysis(null); setFormError(""); }}
                placeholder="Paste the message or link here…"
                aria-describedby="input-help input-count"
              />
              <div className="input-meta"><span id="input-help">Your text is checked locally. Links are parsed as text and never opened.</span><span id="input-count" className="character-count">{input.length.toLocaleString()} / 20,000</span></div>

              <fieldset className="type-picker">
                <legend className="field-label">INPUT TYPE</legend>
                <div className="type-options">
                  {([
                    ["auto", "Automatic", `Detected: ${inferredType}`],
                    ["message", "Message", "Text or SMS"],
                    ["url", "URL", "Web address"],
                    ["claim", "Claim", "Online statement"],
                  ] as [TypeChoice, string, string][]).map(([value, label, hint]) => (
                    <label className={`type-option ${typeChoice === value ? "is-selected" : ""}`} key={value}>
                      <input type="radio" name="input-type" value={value} checked={typeChoice === value} onChange={() => setTypeChoice(value)} />
                      <span className="radio-mark" aria-hidden="true" />
                      <span className="type-copy"><strong>{label}</strong><small>{hint}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="examples-block">
                <div className="examples-heading"><span className="field-label">TRY AN EXAMPLE</span><span>Examples are fictional</span></div>
                <div className="example-list">
                  {examples.map((example) => (
                    <button className="example-button" key={example.label} onClick={() => loadExample(example.text)} type="button">
                      <span className="example-marker" aria-hidden="true">+</span>{example.label}
                    </button>
                  ))}
                </div>
              </div>

              {formError && <p className="form-error" role="alert"><CircleAlert size={16} aria-hidden="true" />{formError}</p>}
              <div className="submit-actions">
                <span className="privacy-line"><LockKeyhole size={15} aria-hidden="true" /> No content is sent to a server.</span>
                <button className="primary-button" onClick={runAnalysis} type="button">Inspect input <ArrowRight size={17} aria-hidden="true" /></button>
              </div>
            </section>
          )}

          {activeStep === 1 && analysis && (
            <section className="inspect-panel" aria-labelledby="inspect-title">
              <div className="panel-label-row"><div><span className="panel-kicker">STEP 02 / 04 · {analysis.inputType.toUpperCase()}</span><h3 id="inspect-title">What the local checks observed</h3></div><button className="text-button edit-button" onClick={editInput} type="button"><ArrowLeft size={15} aria-hidden="true" /> Edit input</button></div>

              <div className="level-panel">
                {(() => {
                  const { label, Icon, className } = levelMeta[analysis.level];
                  return <div className={`level-badge ${className}`}><Icon size={20} aria-hidden="true" /><span>{label}</span></div>;
                })()}
                <p>{analysis.levelExplanation}</p>
              </div>

              <section className="input-review" aria-labelledby="input-review-title">
                <div className="section-title-row"><div><span className="section-kicker">SUBMITTED TEXT</span><h4 id="input-review-title">Matched phrases are underlined</h4></div><span className="match-key"><AlertCircle size={14} aria-hidden="true" /> MATCH</span></div>
                <HighlightedInput text={input} indicators={analysis.indicators} />
              </section>

              <section className="observed-section" aria-labelledby="observed-title">
                <div className="section-title-row"><div><span className="section-kicker">OBSERVED</span><h4 id="observed-title">Indicators from local rules</h4></div><span className="count-tag">{analysis.indicators.length} {analysis.indicators.length === 1 ? "FINDING" : "FINDINGS"}</span></div>
                {analysis.indicators.length ? (
                  <div className="indicator-list">{sortedIndicators(analysis.indicators).map((indicator, index) => <IndicatorCard key={`${indicator.id}-${indicator.span?.start ?? index}-${index}`} indicator={indicator} index={index} />)}</div>
                ) : (
                  <div className="empty-findings"><ShieldCheck size={20} aria-hidden="true" /><p>These local checks found no indicators. This does not mean the content is genuine or safe.</p></div>
                )}
              </section>

              <section className="unknown-section" aria-labelledby="unknown-title">
                <div className="unknown-heading"><CircleHelp size={19} aria-hidden="true" /><div><span className="section-kicker">UNKNOWN</span><h4 id="unknown-title">What we could not check</h4></div></div>
                <ul className="unknown-list">
                  {analysis.unavailableChecks.map((check) => <li key={check.id}><strong>{check.title}</strong><span>{check.reason}</span></li>)}
                </ul>
              </section>

            </section>
          )}

          <aside className="limitation" aria-label="Important limitation">
            <span className="limitation-marker">!</span>
            <p><strong>A note on these checks</strong><br />Automated checks can miss threats and can flag legitimate content. Findings are indicators to consider, not a verdict.</p>
          </aside>

          <div className="step-boundary"><span>INVESTIGATE</span><span>DECIDE & DOCUMENT</span><span className="future-note">LATER PHASES</span></div>
        </section>
      </main>

      <footer className="footer"><span>SONDERA / HACKCOM ’26</span><span>LOCAL BY DESIGN <span className="footer-dot">·</span> EXPLAINABLE BY DEFAULT</span></footer>
    </div>
  );
}
