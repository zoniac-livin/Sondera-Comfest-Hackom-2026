import { ArrowLeft, Download, Info, Printer, ShieldAlert, TriangleAlert, CircleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { createReceiptData, generateReceiptJson, generateReceiptMarkdown, receiptFilename } from "@/report/receipt";
import type { Case, Severity } from "@/types";

const groups: Array<{ severity: Severity; label: string; Icon: typeof ShieldAlert }> = [
  { severity: "high", label: "High", Icon: ShieldAlert },
  { severity: "medium", label: "Medium", Icon: TriangleAlert },
  { severity: "low", label: "Low", Icon: CircleAlert },
  { severity: "info", label: "Info", Icon: Info },
];

function displayDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DecisionReceipt({ caseData, onBack }: { caseData: Case; onBack: () => void }) {
  const [generatedAt] = useState(() => new Date().toISOString());
  const receipt = useMemo(() => createReceiptData(caseData, generatedAt), [caseData, generatedAt]);
  const md = () => download(generateReceiptMarkdown(caseData, generatedAt), receiptFilename(caseData.id, "md"), "text/markdown");
  const json = () => download(generateReceiptJson(caseData, generatedAt), receiptFilename(caseData.id, "json"), "application/json");

  return (
    <article className="receipt-panel" aria-labelledby="receipt-title">
      <div className="receipt-actions no-print">
        <button className="text-button" type="button" onClick={onBack}><ArrowLeft size={15} aria-hidden="true" /> Back to investigate</button>
        <div>
          <button className="secondary-button" type="button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print / Save as PDF</button>
          <button className="secondary-button" type="button" onClick={md}><Download size={16} aria-hidden="true" /> Markdown</button>
          <button className="secondary-button" type="button" onClick={json}><Download size={16} aria-hidden="true" /> JSON</button>
        </div>
      </div>

      <header className="receipt-heading">
        <span className="panel-kicker">SONDERA / CASE RECORD</span>
        <h3 id="receipt-title">Decision Receipt</h3>
        <div className="receipt-meta"><span><strong>Case ID</strong>{receipt.caseId}</span><span><strong>Generated</strong><time dateTime={receipt.generatedAt}>{displayDate(receipt.generatedAt)}</time></span></div>
      </header>

      <section className="receipt-section" aria-labelledby="receipt-input-title">
        <h4 id="receipt-input-title">Original input</h4>
        <pre className="receipt-original">{receipt.originalInput || "No input was recorded."}</pre>
        {receipt.inputTruncated && <p className="receipt-note">Showing the first 1,000 characters of {receipt.inputOriginalLength.toLocaleString()}.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-performed-title">
        <h4 id="receipt-performed-title">Checks actually performed</h4>
        {receipt.checksPerformed.length ? <ul>{receipt.checksPerformed.map((check) => <li key={check}>{check}</li>)}</ul> : <p>No analysis has been run yet; no local message or URL rules are recorded as performed.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-unavailable-title">
        <h4 id="receipt-unavailable-title">Checks not performed</h4>
        <ul>{receipt.checksNotPerformed.map((check) => <li key={check.id}><strong>{check.title}:</strong> {check.reason}</li>)}</ul>
      </section>

      <section className="receipt-section" aria-labelledby="receipt-findings-title">
        <h4 id="receipt-findings-title">Findings</h4>
        {!caseData.analysis && <p>No analysis has been run for this case yet.</p>}
        <div className="receipt-finding-groups">
          {groups.map(({ severity, label, Icon }) => (
            <section className="receipt-finding-group" key={severity} aria-labelledby={`receipt-${severity}-title`}>
              <h5 id={`receipt-${severity}-title`} className={`receipt-severity severity-${severity}`}><Icon size={17} aria-hidden="true" />{label}</h5>
              {receipt.findings[severity].length ? <ul>{receipt.findings[severity].map((finding, index) => <li key={`${finding.id}-${index}`}><strong>{finding.title}</strong><span className="receipt-rule-id">{finding.id}</span><p>{finding.explanation}</p><div className="receipt-evidence"><strong>Exact evidence</strong><q>{finding.evidence}</q></div></li>)}</ul> : <p className="receipt-empty">No findings in this severity.</p>}
            </section>
          ))}
        </div>
      </section>

      <section className="receipt-section" aria-labelledby="receipt-level-title">
        <h4 id="receipt-level-title">Overall level</h4>
        {receipt.level ? <><p className={`receipt-level level-${receipt.level.value}`}>{receipt.level.value === "none-found" ? <Info size={16} aria-hidden="true" /> : receipt.level.value === "some-indicators" ? <CircleAlert size={16} aria-hidden="true" /> : receipt.level.value === "multiple-indicators" ? <TriangleAlert size={16} aria-hidden="true" /> : <ShieldAlert size={16} aria-hidden="true" />}<strong>{receipt.level.value.replace(/-/g, " ")}</strong></p><p>{receipt.level.explanation}</p></> : <p>No overall level is available until analysis is run.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-evidence-title">
        <h4 id="receipt-evidence-title">Evidence references</h4>
        {receipt.evidence.length ? <ul className="receipt-evidence-list">{receipt.evidence.map((note) => <li key={note.id}><h5>{note.title || "Untitled source"}</h5><dl><dt>Source URL</dt><dd>{note.sourceUrl || "Not provided"}</dd><dt>Relationship</dt><dd>{note.supports}</dd><dt>Source type</dt><dd>{note.kind}</dd><dt>Date accessed</dt><dd>{note.accessedOn}</dd></dl><p>{note.note}</p></li>)}</ul> : <p>No evidence notes have been added.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-questions-title">
        <h4 id="receipt-questions-title">Unresolved questions</h4>
        {receipt.unresolvedQuestions.length ? <ul>{receipt.unresolvedQuestions.map((question) => <li key={question.id}><strong>{question.question}</strong><p>{question.why}</p><p><strong>Suggested action:</strong> {question.suggestedAction}</p></li>)}</ul> : <p>No unticked Missing-Proof questions are recorded.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-timeline-title">
        <h4 id="receipt-timeline-title">Context Clock timeline</h4>
        {receipt.timeline.length ? <ol className="receipt-timeline">{receipt.timeline.map((point) => <li key={`${point.field}-${point.date}`}><strong>{point.label}</strong><time dateTime={point.date}>{point.date}</time></li>)}</ol> : <p>No dates were entered.</p>}
        <h5 className="receipt-subhead">Worth checking</h5>
        {receipt.dateWarnings.length ? <ul>{receipt.dateWarnings.map((warning) => <li key={warning.id}>{warning.message}</li>)}</ul> : <p>No date warnings from the entered dates.</p>}
      </section>

      <section className="receipt-section" aria-labelledby="receipt-actions-title">
        <h4 id="receipt-actions-title">Recommended actions</h4>
        <p className="receipt-note">These are general steps to consider; choose what fits your situation.</p>
        <ul>{receipt.recommendedActions.map((action) => <li key={action}>{action}</li>)}</ul>
      </section>

      <section className="receipt-section" aria-labelledby="receipt-notes-title">
        <h4 id="receipt-notes-title">User notes</h4>
        <pre className="receipt-original">{receipt.userNotes || "No user notes."}</pre>
      </section>

      <section className="receipt-section" aria-labelledby="receipt-revisions-title">
        <h4 id="receipt-revisions-title">Revision history</h4>
        {receipt.revisions.length ? <ol>{receipt.revisions.map((revision, index) => <li key={`${revision.at}-${index}`}><time dateTime={revision.at}>{displayDate(revision.at)}</time> — {revision.summary}</li>)}</ol> : <p>No revision entries.</p>}
      </section>

      <section className="receipt-section receipt-limitations" aria-labelledby="receipt-limitations-title">
        <h4 id="receipt-limitations-title">Limitations</h4>
        <p>{receipt.limitations}</p>
      </section>
    </article>
  );
}
