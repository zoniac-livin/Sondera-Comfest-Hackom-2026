import { AlertCircle, Check, CircleHelp, Clock3, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { analyzeContextDates, getLocalToday } from "@/analysis/contextClock";
import { analyzeUrl } from "@/analysis/url";
import type { Analysis, ContextDates, EvidenceNote } from "@/types";

type NoteDraft = Omit<EvidenceNote, "id">;

function newDraft(today: string): NoteDraft {
  return { sourceUrl: "", title: "", accessedOn: today, supports: "unclear", kind: "direct", note: "" };
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function sourceUrlIsParsable(value: string): boolean {
  if (!value.trim()) return false;
  const parsed = analyzeUrl(value.trim()).parsed;
  return parsed !== null && (parsed.protocol === "http:" || parsed.protocol === "https:");
}

export function Investigation({ analysis, hidden }: { analysis: Analysis; hidden: boolean }) {
  const today = getLocalToday();
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(() => new Set());
  const [dates, setDates] = useState<ContextDates>(() => ({ checked: today }));
  const [notes, setNotes] = useState<EvidenceNote[]>([]);
  const [draft, setDraft] = useState<NoteDraft>(() => newDraft(today));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState("");
  const clock = useMemo(() => analyzeContextDates({ ...dates, checked: today }, today), [dates, today]);
  const invalidSource = Boolean(draft.sourceUrl.trim()) && !sourceUrlIsParsable(draft.sourceUrl);
  const supportCounts = notes.reduce((counts, note) => ({ ...counts, [note.supports]: counts[note.supports] + 1 }), {
    supports: 0, contradicts: 0, unclear: 0,
  });
  const repostCount = notes.filter((note) => note.kind === "repost").length;
  const visibleQuestions = dates.published
    ? analysis.missingProof.filter((question) => question.id !== "proof.publication-date")
    : analysis.missingProof;

  const toggleQuestion = (id: string) => {
    setCheckedQuestions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateDate = (field: "published" | "event" | "received", value: string) => {
    setDates((current) => ({ ...current, [field]: value || undefined, checked: today }));
  };

  const updateDraft = <K extends keyof NoteDraft>(field: K, value: NoteDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated: EvidenceNote = { ...draft, id: editingId ?? createId() };
    setNotes((current) => editingId
      ? current.map((note) => note.id === editingId ? updated : note)
      : [...current, updated]);
    setFormMessage(editingId ? "Evidence note updated in this session." : "Evidence note added in this session.");
    setEditingId(null);
    setDraft(newDraft(today));
  };

  const editNote = (note: EvidenceNote) => {
    setEditingId(note.id);
    setDraft({ sourceUrl: note.sourceUrl, title: note.title, accessedOn: note.accessedOn, supports: note.supports, kind: note.kind, note: note.note });
    setFormMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(newDraft(today));
    setFormMessage("");
  };

  const deleteNote = (id: string) => {
    setNotes((current) => current.filter((note) => note.id !== id));
    if (editingId === id) cancelEdit();
    setFormMessage("Evidence note removed from this session.");
  };

  return (
    <section className="investigate-panel" aria-label="Investigate" hidden={hidden}>
      <div className="phase-intro">
        <div><span className="panel-kicker">STEP 03 / 04</span><h3>Investigate what is missing</h3></div>
        <p>These prompts are for your own checks. Sondera does not answer or verify them.</p>
      </div>

      <section className="investigation-section proof-section" aria-labelledby="proof-title">
        <div className="investigation-section-heading">
          <CircleHelp size={20} aria-hidden="true" />
          <div><span className="section-kicker">MISSING-PROOF FINDER</span><h4 id="proof-title">Questions to check yourself</h4></div>
        </div>
        {visibleQuestions.length ? (
          <ul className="proof-list">
            {visibleQuestions.map((item) => (
              <li className={checkedQuestions.has(item.id) ? "proof-item is-checked" : "proof-item"} key={item.id}>
                <label className="proof-check">
                  <input type="checkbox" checked={checkedQuestions.has(item.id)} onChange={() => toggleQuestion(item.id)} />
                  <span className="checkmark" aria-hidden="true"><Check size={13} /></span>
                  <span className="proof-question">{item.question}</span>
                </label>
                <p className="proof-why"><strong>Why check:</strong> {item.why}</p>
                <p className="proof-action"><strong>Suggested action:</strong> {item.suggestedAction}</p>
              </li>
            ))}
          </ul>
        ) : <p className="section-empty">There are no tailored questions for these observations. You can still add evidence or dates below.</p>}
      </section>

      <section className="investigation-section context-section" aria-labelledby="context-title">
        <div className="investigation-section-heading">
          <Clock3 className="clock-glyph" size={20} strokeWidth={2} aria-hidden="true" />
          <div><span className="section-kicker">CONTEXT CLOCK</span><h4 id="context-title">When did this happen?</h4></div>
          <span className="checked-today">CHECKED TODAY · {formatDate(clock.checked)}</span>
        </div>
        <div className="date-fields">
          <label className="date-field"><span>Published</span><input type="date" value={dates.published ?? ""} onChange={(event) => updateDate("published", event.target.value)} /></label>
          <label className="date-field"><span>Event</span><input type="date" value={dates.event ?? ""} onChange={(event) => updateDate("event", event.target.value)} /></label>
          <label className="date-field"><span>Received</span><input type="date" value={dates.received ?? ""} onChange={(event) => updateDate("received", event.target.value)} /></label>
        </div>
        <div className="timeline-wrap">
          <div className="timeline-track" aria-hidden="true" />
          <ol className="timeline" aria-label="Entered dates from earliest to latest">
            {clock.timeline.map((point) => (
              <li className="timeline-point" key={point.field}>
                <span className="timeline-dot" aria-hidden="true" />
                <strong>{point.label}</strong><time dateTime={point.date}>{formatDate(point.date)}</time>
              </li>
            ))}
          </ol>
        </div>
        <div className="context-warnings" aria-live="polite">
          {clock.warnings.length ? (
            <ul>{clock.warnings.map((warning) => <li key={warning.id}><AlertCircle size={16} aria-hidden="true" /><span>{warning.message}</span></li>)}</ul>
          ) : <p>No date warnings from these checks. Dates do not establish whether a message is current or accurate.</p>}
        </div>
      </section>

      <section className="investigation-section evidence-section" aria-labelledby="evidence-title">
        <div className="investigation-section-heading">
          <Plus size={20} aria-hidden="true" />
          <div><span className="section-kicker">EVIDENCE NOTES</span><h4 id="evidence-title">Record what you find</h4></div>
        </div>
        <div className="note-counts" aria-label="Evidence note summary">
          <span><strong>{supportCounts.supports}</strong> supports</span>
          <span><strong>{supportCounts.contradicts}</strong> contradicts</span>
          <span><strong>{supportCounts.unclear}</strong> unclear</span>
        </div>
        {repostCount > 1 && <p className="repost-warning"><AlertCircle size={16} aria-hidden="true" />Repeated copies are not independent confirmation.</p>}

        {notes.length > 0 && (
          <ul className="evidence-list">
            {notes.map((note) => (
              <li className="evidence-note" key={note.id}>
                <div className="note-heading"><div><span className="note-position">{note.supports.toUpperCase()} · {note.kind.toUpperCase()}</span><h5>{note.title}</h5></div>
                  <div className="note-actions"><button className="quiet-button" type="button" onClick={() => editNote(note)}>Edit</button><button className="quiet-button delete-note" type="button" onClick={() => deleteNote(note.id)} aria-label={`Delete ${note.title}`}><Trash2 size={15} aria-hidden="true" /> Delete</button></div>
                </div>
                {note.sourceUrl && <p className="note-source"><span>Source URL</span><span>{note.sourceUrl}</span>{!sourceUrlIsParsable(note.sourceUrl) && <span className="url-warning">Could not parse this URL. The note is kept; this address was not opened.</span>}</p>}
                <p className="note-meta">Accessed {formatDate(note.accessedOn)}</p>
                <p className="note-body">{note.note}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="evidence-form" onSubmit={saveNote}>
          <div className="form-heading"><h5>{editingId ? "Edit evidence note" : "Add an evidence note"}</h5><span>Notes stay in this page session.</span></div>
          <label className="note-field"><span>Source URL <small>optional</small></span><input type="text" inputMode="url" value={draft.sourceUrl} onChange={(event) => updateDraft("sourceUrl", event.target.value)} placeholder="https://example.org/source" />
            {invalidSource && <span className="url-warning" role="status">This URL could not be parsed. You can still save this note; it will not be opened or fetched.</span>}
            {!draft.sourceUrl.trim() && <span className="field-hint">The source URL is never opened or fetched.</span>}
          </label>
          <div className="note-field-grid">
            <label className="note-field"><span>Title</span><input required value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder="Name this source" /></label>
            <label className="note-field"><span>Date accessed</span><input required type="date" value={draft.accessedOn} onChange={(event) => updateDraft("accessedOn", event.target.value)} /></label>
            <label className="note-field"><span>This source</span><select value={draft.supports} onChange={(event) => updateDraft("supports", event.target.value as EvidenceNote["supports"])}><option value="supports">Supports the claim</option><option value="contradicts">Contradicts the claim</option><option value="unclear">Unclear</option></select></label>
            <label className="note-field"><span>Source type</span><select value={draft.kind} onChange={(event) => updateDraft("kind", event.target.value as EvidenceNote["kind"])}><option value="direct">Direct source</option><option value="inference">Inference</option><option value="repost">Repost / copy</option></select></label>
          </div>
          <label className="note-field"><span>Note</span><textarea required rows={3} value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} placeholder="What does this source say? What is still unclear?" /></label>
          <div className="note-form-actions">
            <p className="form-message" role="status">{formMessage}</p>
            {editingId && <button className="quiet-button" type="button" onClick={cancelEdit}>Cancel edit</button>}
            <button className="secondary-button" type="submit">{editingId ? "Save changes" : "Add note"}</button>
          </div>
        </form>
      </section>
    </section>
  );
}
