import {
  AlertCircle, ArrowLeft, ArrowRight, CircleAlert, CircleHelp,
  Info, LockKeyhole, MessageSquareText, Plus, ShieldAlert,
  TriangleAlert, type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyze } from "@/analysis";
import { analyzeUrl } from "@/analysis/url";
import { Investigation } from "@/components/Investigation";
import { DecisionReceipt } from "@/components/DecisionReceipt";
import { Stepper } from "@/components/ui/stepper";
import { clearStoredData, getBrowserStorage, loadCase, saveCase } from "@/storage";
import { getLocalToday } from "@/analysis/contextClock";
import type { Analysis, Case, ContextDates, EvidenceNote, Indicator, InputType, Severity } from "@/types";

type TypeChoice = "auto" | InputType;

const steps = [
  { name: "Submit", detail: "Share a message or link" },
  { name: "Inspect", detail: "Review what was observed" },
  { name: "Investigate", detail: "Check what is missing" },
  { name: "Decide & document", detail: "Review and export the receipt" },
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
  "none-found": { label: "No indicators found", Icon: Info, className: "level-none" },
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

function createCase(): Case {
  const now = new Date().toISOString();
  const id = globalThis.crypto?.randomUUID?.() ?? `case-${Date.now()}`;
  return { id, createdAt: now, updatedAt: now, input: "", inputType: "message", evidence: [], dates: { checked: getLocalToday() }, checkedQuestions: [], userNotes: "", revisions: [{ at: now, summary: "Case created" }] };
}

function addRevision(caseData: Case, summary: string): Case {
  const at = new Date().toISOString();
  return { ...caseData, updatedAt: at, revisions: [...caseData.revisions, { at, summary }].slice(-100) };
}

function initialState(): { activeCase: Case; recoveryMessage: string } {
  try {
    const result = loadCase(getBrowserStorage());
    if (result.status === "loaded") return { activeCase: result.activeCase, recoveryMessage: "" };
    if (result.status === "recovery") return { activeCase: createCase(), recoveryMessage: result.reason };
  } catch {
    return { activeCase: createCase(), recoveryMessage: "Browser storage is unavailable. Your current work will stay in memory." };
  }
  return { activeCase: createCase(), recoveryMessage: "" };
}

function clockTime(date: Date): string { return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`; }

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
  const [initial] = useState(initialState);
  const [caseData, setCaseData] = useState<Case>(initial.activeCase);
  const [recoveryMessage, setRecoveryMessage] = useState(initial.recoveryMessage);
  const [activeStep, setActiveStep] = useState(initial.activeCase.analysis ? 1 : 0);
  const [typeChoice, setTypeChoice] = useState<TypeChoice>(initial.activeCase.inputType);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error">(initial.recoveryMessage ? "error" : "saving");
  const [savedAt, setSavedAt] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");
  const skipSave = useRef(false);
  const input = caseData.input;
  const analysis = caseData.analysis ?? null;
  const inferredType = useMemo(() => detectType(input), [input]);

  useEffect(() => {
    if (recoveryMessage) return;
    if (skipSave.current) { skipSave.current = false; return; }
    setSaveState("saving");
    const timeout = window.setTimeout(() => {
      try {
        saveCase(getBrowserStorage(), caseData);
        setSavedAt(clockTime(new Date()));
        setSaveState("saved");
      } catch {
        setSaveState("error");
        setRecoveryMessage("Browser storage is unavailable or full. Your current work is still available in this page, but it could not be saved locally.");
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [caseData, recoveryMessage]);

  const updateInput = (value: string) => setCaseData((current) => ({ ...current, input: value, analysis: undefined, updatedAt: new Date().toISOString() }));
  const updateTypeChoice = (choice: TypeChoice) => {
    setTypeChoice(choice);
    setCaseData((current) => ({ ...current, inputType: choice === "auto" ? inferredType : choice, analysis: undefined, updatedAt: new Date().toISOString() }));
  };
  const startNewCase = () => {
    setCaseData(createCase()); setTypeChoice("auto"); setRecoveryMessage(""); setSaveState("saving"); setActiveStep(0); setFormError("");
  };
  const resetStoredData = () => {
    try {
      clearStoredData(getBrowserStorage());
      skipSave.current = true;
      setCaseData(createCase()); setTypeChoice("auto"); setActiveStep(0); setRecoveryMessage(""); setSaveState("saved"); setSavedAt(""); setConfirmDelete(false); setFormError("");
    } catch {
      setSaveState("error"); setRecoveryMessage("Stored data could not be cleared because browser storage is unavailable."); setConfirmDelete(false);
    }
  };

  const runAnalysis = () => {
    if (!input.trim()) {
      setFormError("Paste a message, link, or claim first.");
      return;
    }
    const selectedType = typeChoice === "auto" ? inferredType : typeChoice;
    const result = analyze(input, selectedType);
    setCaseData((current) => addRevision({ ...current, inputType: selectedType, analysis: result }, "Analysis run"));
    setFormError("");
    setActiveStep(1);
  };

  const loadExample = (text: string) => {
    updateInput(text);
    setTypeChoice("auto");
    setFormError("");
  };

  const editInput = () => {
    setCaseData((current) => ({ ...current, analysis: undefined, updatedAt: new Date().toISOString() }));
    setActiveStep(0);
  };

  const updateEvidence = (evidence: EvidenceNote[], revision?: string) => setCaseData((current) => revision
    ? addRevision({ ...current, evidence }, revision)
    : { ...current, evidence, updatedAt: new Date().toISOString() });
  const updateDates = (dates: ContextDates) => setCaseData((current) => addRevision({ ...current, dates }, "Dates edited"));
  const updateCheckedQuestions = (checkedQuestions: string[]) => setCaseData((current) => ({ ...current, checkedQuestions, updatedAt: new Date().toISOString() }));
  const updateUserNotes = (userNotes: string) => setCaseData((current) => ({ ...current, userNotes, updatedAt: new Date().toISOString() }));

  return (
    <div className="app-shell min-h-screen bg-bg font-body text-text antialiased">
      <header className="topbar">
        <a className="wordmark" href="#submit" aria-label="Sondera — start an investigation">SONDERA<span className="wordmark-mark">/</span></a>
        <p className="header-tagline">Know what you know. <span>Find what you don’t.</span></p>
        <div className="case-tools">
          <span className={`save-state-chip ${saveState === "error" ? "save-error" : ""}`} aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "error" ? "Could not save" : savedAt ? `Saved locally at ${savedAt}` : "Saved locally"}</span>
          <button className="quiet-button" type="button" onClick={startNewCase}>New case</button>
          <button className="quiet-button delete-note" type="button" onClick={() => setConfirmDelete(true)}>Delete all my data</button>
          <span className="case-ref"><LockKeyhole size={14} aria-hidden="true" />PRIVATE WORKSPACE<span className="case-number">CASE {caseData.id.slice(-4).toUpperCase()}</span></span>
        </div>
      </header>

      <main id="submit">
        <div className="page-heading">
          <div className="eyebrow"><span className="eyebrow-rule" /> LOCAL MESSAGE & LINK CHECKS</div>
          <h1>{activeStep === 0 ? <>Start with what<br /><span>you received.</span></> : activeStep === 1 ? <>Review what<br /><span>was observed.</span></> : activeStep === 2 ? <>Find what is<br /><span>still missing.</span></> : <>Record what<br /><span>you learned.</span></>}</h1>
          <p className="page-intro">Examine a message or link with clear, local checks. See matched phrases, what remains unknown, and what to consider next.</p>
        </div>

        <section className="workspace" aria-label="Investigation workspace">
          <div className="workspace-heading">
            <div><span className="section-kicker">INVESTIGATION FILE</span><h2>{activeStep === 0 ? "Submit an item" : activeStep === 1 ? "Inspection notes" : activeStep === 2 ? "Investigate evidence" : "Decision receipt"}</h2></div>
            <span className="file-tag">NO. 0001 <MessageSquareText size={15} aria-hidden="true" /></span>
          </div>
          {recoveryMessage && <div className="storage-warning" role="status"><span>{recoveryMessage}</span>{!recoveryMessage.includes("could not be cleared") && <button className="quiet-button" type="button" onClick={resetStoredData}>Reset stored data</button>}</div>}
          <Stepper steps={steps} activeIndex={activeStep} availableThrough={analysis ? 3 : 0} onStepClick={setActiveStep} />

          {activeStep === 0 && (
            <section className="submit-panel" aria-labelledby="submit-title">
              <div className="panel-label-row"><div><span className="panel-kicker">STEP 01 / 04</span><h3 id="submit-title">What would you like to inspect?</h3></div><span className="local-tag"><LockKeyhole size={14} aria-hidden="true" /> STAYS ON THIS DEVICE</span></div>
              <label className="field-label" htmlFor="input-content">MESSAGE, LINK OR CLAIM</label>
              <textarea
                id="input-content"
                className="input-area"
                value={input}
                maxLength={20_000}
                onChange={(event) => { updateInput(event.target.value); setFormError(""); }}
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
                      <input type="radio" name="input-type" value={value} checked={typeChoice === value} onChange={() => updateTypeChoice(value)} />
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
                      <Plus size={14} className="example-marker" aria-hidden="true" />{example.label}
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
                  <div className="empty-findings"><Info size={20} aria-hidden="true" /><p>These local checks found no indicators. This does not mean the content is genuine or safe.</p></div>
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

          {analysis && <Investigation analysis={analysis} hidden={activeStep !== 2} caseData={caseData} onEvidenceChange={updateEvidence} onDatesChange={updateDates} onCheckedQuestionsChange={updateCheckedQuestions} onUserNotesChange={updateUserNotes} />}
          {activeStep === 3 && <DecisionReceipt caseData={caseData} onBack={() => setActiveStep(2)} />}

          <aside className="limitation" aria-label="Important limitation">
            <span className="limitation-marker">!</span>
            <p><strong>A note on these checks</strong><br />Automated checks can miss threats and can flag legitimate content. Findings are indicators to consider, not a verdict.</p>
          </aside>

        </section>
      </main>

      <footer className="footer"><span>SONDERA / HACKCOM ’26</span><span className="footer-limit">Automated checks can miss threats and can flag legitimate content.</span><span>Your content stays in your browser. Sondera does not send it anywhere.</span></footer>
      {confirmDelete && <div className="confirm-backdrop"><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description"><h3 id="delete-title">Delete all stored data?</h3><p id="delete-description">This clears the saved case from this browser and starts a blank case. This cannot be undone.</p><div><button className="quiet-button" type="button" onClick={() => setConfirmDelete(false)}>Cancel</button><button className="secondary-button danger-button" type="button" onClick={resetStoredData}>Delete all my data</button></div></section></div>}
    </div>
  );
}
