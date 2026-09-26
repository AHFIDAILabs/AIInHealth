import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, CalendarDays, Users } from 'lucide-react';
import {
  adminListPendingTranslations,
  type PendingTranslation,
} from '../../services/translationReview.service';
import { adminUpdateSessionTranslation, type TranslationLang } from '../../services/session.service';
import { adminUpdateSpeakerTranslation } from '../../services/speaker.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AdminTextarea } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

const LANG_LABEL: Record<TranslationLang, string> = { fr: 'French', pt: 'Portuguese' };

// One flat queue across both models — the whole point is an admin never has
// to go open a session's or speaker's own edit form just to find the
// translation panel buried inside it (see backend
// translationReview.controller.ts's comment). Approve/reject each call the
// same per-model endpoints the individual edit-form panels already use.
export const TranslationsQueuePage = () => {
  const toast = useToast();
  const [items, setItems] = useState<PendingTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [working, setWorking] = useState<Record<string, boolean>>({});

  const itemKey = (item: PendingTranslation) => `${item.contentType}-${item.id}-${item.lang}`;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListPendingTranslations()
      .then((res) => {
        setItems(res.items);
        const initialDrafts: Record<string, string> = {};
        res.items.forEach((item) => {
          initialDrafts[itemKey(item)] =
            item.contentType === 'session' ? (item.draft.title ?? '') : (item.draft.bio ?? '');
        });
        setDrafts(initialDrafts);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const setBusy = (key: string, busy: boolean) => setWorking((prev) => ({ ...prev, [key]: busy }));

  const approve = async (item: PendingTranslation) => {
    const key = itemKey(item);
    setBusy(key, true);
    try {
      if (item.contentType === 'session') {
        await adminUpdateSessionTranslation(item.id, item.lang, {
          title: drafts[key] || item.draft.title || item.original.title,
          description: item.draft.description,
          status: 'approved',
        });
      } else {
        await adminUpdateSpeakerTranslation(item.id, item.lang, {
          bio: drafts[key] || item.draft.bio || item.original.bio,
          status: 'approved',
        });
      }
      setItems((prev) => prev.filter((i) => itemKey(i) !== key));
      toast('success', `${item.label} (${LANG_LABEL[item.lang]}) approved`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(key, false);
    }
  };

  // Session/Speaker translations only have none/draft/approved (unlike
  // PolicyTrackerEntry's dedicated 'rejected' status) — discarding a draft
  // just clears it back to 'none' so a fresh "Generate with AI" starts
  // clean, rather than leaving a rejected-but-still-present draft around.
  const discard = async (item: PendingTranslation) => {
    const key = itemKey(item);
    setBusy(key, true);
    try {
      if (item.contentType === 'session') {
        await adminUpdateSessionTranslation(item.id, item.lang, { status: 'none' });
      } else {
        await adminUpdateSpeakerTranslation(item.id, item.lang, { status: 'none' });
      }
      setItems((prev) => prev.filter((i) => itemKey(i) !== key));
      toast('success', `${item.label} (${LANG_LABEL[item.lang]}) draft discarded`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(key, false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Translations to Review</h1>
        <p className="text-sm text-slate-500">
          Every AI-drafted French/Portuguese translation waiting on a decision, across Sessions and Speakers, in one
          place — {items.length} pending.
        </p>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
            <SkeletonRows rows={4} cols={2} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white py-20 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
              <CheckCircle2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">Nothing waiting on review</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              New drafts show up here as soon as an admin generates one from the Sessions or Speakers edit form.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const key = itemKey(item);
              const busy = !!working[key];
              return (
                <div key={key} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange">
                      {item.contentType === 'session' ? <CalendarDays size={15} /> : <Users size={15} />}
                    </span>
                    <p className="font-semibold text-navy">{item.label}</p>
                    <span className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[11px] font-semibold text-orange">
                      {LANG_LABEL[item.lang]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 capitalize">
                      {item.contentType}
                    </span>
                  </div>

                  {item.contentType === 'session' && (
                    <p className="mt-2 text-xs text-slate-400">Original: {item.original.title}</p>
                  )}

                  <div className="mt-3">
                    <AdminTextarea
                      label={item.contentType === 'session' ? 'Translated Title' : 'Translated Bio'}
                      id={`translation-draft-${key}`}
                      value={drafts[key] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                  {item.contentType === 'session' && item.draft.description && (
                    <p className="mt-2 text-[13px] text-slate-500">
                      <span className="font-semibold text-slate-600">Description draft:</span> {item.draft.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => discard(item)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                    >
                      <XCircle size={14} /> Discard
                    </button>
                    <button
                      onClick={() => approve(item)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg bg-success px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-success/90 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> {busy ? 'Working…' : 'Approve'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
