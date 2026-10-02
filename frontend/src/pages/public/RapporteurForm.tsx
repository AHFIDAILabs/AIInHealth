import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, CheckCircle2, CloudOff, Cloud, Loader2, AlertTriangle, Mic, Square, Sparkles } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { useRapporteurAutosave, type SyncState } from '../../hooks/useRapporteurAutosave';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import {
  submitRapporteurReport,
  transcribeQuoteAudio,
  type RapporteurActionItem,
  type RapporteurQuote,
} from '../../services/rapporteur.service';
import { getApiErrorMessage } from '../../services/api';

const SYNC_LABEL: Record<SyncState, { text: string; Icon: typeof Cloud; className: string }> = {
  synced: { text: 'Saved', Icon: CheckCircle2, className: 'text-success' },
  pending: { text: 'Saving…', Icon: Loader2, className: 'text-slate-400' },
  offline: { text: "Offline — saved to this device, will sync when you're back online", Icon: CloudOff, className: 'text-warning' },
  error: { text: 'Sync failed — will keep retrying', Icon: AlertTriangle, className: 'text-danger' },
};

const SyncBadge = ({ state, lastSyncedAt }: { state: SyncState; lastSyncedAt: Date | null }) => {
  const { text, Icon, className } = SYNC_LABEL[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}>
      <Icon size={13} className={state === 'pending' ? 'animate-spin' : ''} />
      {text}
      {state === 'synced' && lastSyncedAt && <span className="text-slate-400">&middot; {lastSyncedAt.toLocaleTimeString()}</span>}
    </span>
  );
};

// A reusable "add a line, see the list below" block — Key Points/Decisions use
// one plain-text field; Action Items/Quotes pass extra optional fields via
// `extra`.
function LineList<T extends { text: string }>({
  label,
  placeholder,
  items,
  onChange,
  renderExtra,
  extraDefaults,
}: {
  label: string;
  placeholder: string;
  items: T[];
  onChange: (items: T[]) => void;
  renderExtra?: (draft: Partial<T>, setDraft: (d: Partial<T>) => void) => React.ReactNode;
  extraDefaults?: Partial<T>;
}) {
  const [text, setText] = useState('');
  const [extra, setExtra] = useState<Partial<T>>(extraDefaults ?? {});

  const add = () => {
    if (!text.trim()) return;
    onChange([...items, { ...extra, text: text.trim() } as T]);
    setText('');
    setExtra(extraDefaults ?? {});
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-display text-sm font-semibold text-navy">{label}</h3>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-offwhite px-3 py-2 text-sm text-slate-700">
              <span className="min-w-0 flex-1">
                {item.text}
                {'owner' in item && (item as unknown as RapporteurActionItem).owner && (
                  <span className="ml-1.5 text-xs text-slate-400">— {(item as unknown as RapporteurActionItem).owner}</span>
                )}
                {'dueDate' in item && (item as unknown as RapporteurActionItem).dueDate && (
                  <span className="ml-1.5 text-xs text-slate-400">(due {(item as unknown as RapporteurActionItem).dueDate})</span>
                )}
                {'speaker' in item && (item as unknown as RapporteurQuote).speaker && (
                  <span className="ml-1.5 text-xs text-slate-400">— {(item as unknown as RapporteurQuote).speaker}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="shrink-0 text-slate-300 hover:text-danger"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
        {renderExtra?.(extra, setExtra)}
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}

// Notable Quotes gets its own block rather than reusing the generic LineList
// above — Stage 2's "Capture This Quote" needs to pre-fill the text input
// from a transcription result, which would mean lifting LineList's internal
// text/extra state out just for this one of its four call sites. A small
// amount of duplicated add/remove JSX here is simpler than that.
function NotableQuotesSection({
  token,
  items,
  onChange,
}: {
  token: string;
  items: RapporteurQuote[];
  onChange: (items: RapporteurQuote[]) => void;
}) {
  const [text, setText] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [capturedViaAudio, setCapturedViaAudio] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordError, setRecordError] = useState('');
  const recorder = useAudioRecorder({ maxDurationSec: 45 });

  const add = () => {
    if (!text.trim()) return;
    onChange([...items, { text: text.trim(), speaker: speaker.trim() || undefined, capturedViaAudio }]);
    setText('');
    setSpeaker('');
    setCapturedViaAudio(false);
  };

  const toggleRecord = async () => {
    setRecordError('');
    if (recorder.recording) {
      const blob = await recorder.stop();
      setTranscribing(true);
      try {
        const res = await transcribeQuoteAudio(token, blob);
        setText(res.text);
        setCapturedViaAudio(true);
      } catch (err) {
        setRecordError(getApiErrorMessage(err, "Couldn't transcribe that clip — try again, or type the quote directly."));
      } finally {
        setTranscribing(false);
      }
    } else {
      await recorder.start();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-display text-sm font-semibold text-navy">Notable Quotes</h3>
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 rounded-lg bg-offwhite px-3 py-2 text-sm text-slate-700">
              <span className="min-w-0 flex-1">
                {item.text}
                {item.speaker && <span className="ml-1.5 text-xs text-slate-400">— {item.speaker}</span>}
                {item.capturedViaAudio && (
                  <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange">
                    <Mic size={9} /> Recorded
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="shrink-0 text-slate-300 hover:text-danger"
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {recordError && (
        <div className="mt-3">
          <Banner variant="error">{recordError}</Banner>
        </div>
      )}
      {recorder.error && (
        <div className="mt-3">
          <Banner variant="error">{recorder.error}</Banner>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setCapturedViaAudio(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder='"A quote worth capturing…"'
          className="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
        <input
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          placeholder="Speaker (optional)"
          className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void toggleRecord()}
          disabled={transcribing}
          title={recorder.recording ? 'Stop recording' : 'Record a quote'}
          className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
            recorder.recording ? 'bg-danger text-white hover:bg-danger/90' : 'border border-slate-200 text-slate-600 hover:border-orange/40'
          }`}
        >
          {transcribing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : recorder.recording ? (
            <Square size={13} />
          ) : (
            <Mic size={13} />
          )}
          {transcribing ? 'Transcribing…' : recorder.recording ? `Stop (${recorder.elapsedSec}s)` : 'Record'}
        </button>
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="flex shrink-0 items-center gap-1 rounded-lg bg-orange px-3 py-2 text-xs font-semibold text-white hover:bg-orange-hover disabled:opacity-50"
        >
          <Plus size={13} /> Add
        </button>
      </div>
      {capturedViaAudio && text && (
        <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
          <Sparkles size={12} /> Transcribed — review the text above before adding, then edit freely if needed.
        </p>
      )}
    </div>
  );
}

export const RapporteurForm = () => {
  const { token = '' } = useParams<{ token: string }>();
  const { report, loadError, data, setField, syncState, lastSyncedAt, saveNow, flushPending } = useRapporteurAutosave(token);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<{ aiPolishError: string | null } | null>(null);

  const onSubmit = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      await flushPending();
      const res = await submitRapporteurReport(token);
      setResult({ aiPolishError: res.aiPolishError });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <section className="bg-offwhite py-20">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <Banner variant="error">{loadError}</Banner>
        </div>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="bg-offwhite py-20">
        <div className="mx-auto max-w-lg px-4 text-center text-sm text-slate-400">Loading your session notes…</div>
      </section>
    );
  }

  if (result || report.status === 'submitted') {
    return (
      <section className="bg-offwhite py-20">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
            <CheckCircle2 size={40} className="mx-auto text-success" />
            <p className="mt-4 font-display text-lg font-semibold text-navy">Notes submitted — thank you!</p>
            <p className="mt-2 text-sm text-slate-500">
              Your session report for &ldquo;{report.session.title}&rdquo; has been recorded.
            </p>
            {result?.aiPolishError && (
              <p className="mt-3 text-xs text-slate-400">
                Your notes saved successfully. We couldn&rsquo;t auto-generate a polished summary this time — the organizing team will
                follow up if needed.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-offwhite py-12">
      <SEO title="Rapporteur Notes" description="Session rapporteur note-taking." path="/rapporteur" noindex />
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {report.session.day}, {report.session.startTime} &middot; {report.session.room}
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold text-navy">{report.session.title}</h1>
          <div className="mt-3 flex items-center justify-between gap-2">
            <SyncBadge state={syncState} lastSyncedAt={lastSyncedAt} />
            <button type="button" onClick={() => void saveNow()} className="text-xs font-semibold text-orange hover:text-orange-hover">
              Save Now
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <LineList
            label="Key Points"
            placeholder="A key point discussed…"
            items={(data.keyPoints ?? []).map((text) => ({ text }))}
            onChange={(items) => setField('keyPoints', items.map((i) => i.text))}
          />
          <LineList
            label="Decisions"
            placeholder="A decision made…"
            items={(data.decisions ?? []).map((text) => ({ text }))}
            onChange={(items) => setField('decisions', items.map((i) => i.text))}
          />
          <LineList<RapporteurActionItem>
            label="Action Items"
            placeholder="What needs to happen…"
            items={data.actionItems ?? []}
            onChange={(items) => setField('actionItems', items)}
            extraDefaults={{}}
            renderExtra={(extra, setExtra) => (
              <>
                <input
                  value={extra.owner ?? ''}
                  onChange={(e) => setExtra({ ...extra, owner: e.target.value })}
                  placeholder="Owner (optional)"
                  className="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                />
                <input
                  value={extra.dueDate ?? ''}
                  onChange={(e) => setExtra({ ...extra, dueDate: e.target.value })}
                  placeholder="Due (optional)"
                  className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                />
              </>
            )}
          />
          <NotableQuotesSection token={token} items={data.notableQuotes ?? []} onChange={(items) => setField('notableQuotes', items)} />
        </div>

        {submitError && (
          <div className="mt-4">
            <Banner variant="error">{submitError}</Banner>
          </div>
        )}

        <Button variant="primary" className="mt-6 w-full justify-center" loading={submitting} onClick={onSubmit}>
          Submit Session Notes
        </Button>
        <p className="mt-2 text-center text-xs text-slate-400">
          Your notes save automatically as you type, even if your connection drops.
        </p>
      </div>
    </section>
  );
};
