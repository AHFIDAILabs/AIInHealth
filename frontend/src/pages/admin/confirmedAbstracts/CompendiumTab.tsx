import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, X, Eye, Pencil, CheckCircle2, XCircle, Plus, Trash2, ShieldCheck } from 'lucide-react';
import {
  adminListConfirmedAbstracts,
  adminUpdateConfirmedAbstract,
  adminRecordConsent,
  adminBulkRecordConsent,
  adminSetCompendiumStatus,
  COMPENDIUM_CONSENT_METHODS,
  COMPENDIUM_PUBLICATION_STATUSES,
  type AdminConfirmedAbstract,
  type CompendiumAuthor,
  type CompendiumConsentMethod,
  type CompendiumPublicationStatus,
} from '../../../services/confirmedAbstract.service';
import { listTracks, type PublicTrack } from '../../../services/track.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { AdminInput, AdminTextarea, AdminSelect } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

const STATUS_LABEL: Record<CompendiumPublicationStatus, string> = {
  none: 'Not started',
  draft: 'Draft',
  ready: 'Ready',
  published: 'Published',
  withdrawn: 'Withdrawn',
};
const STATUS_COLOR: Record<CompendiumPublicationStatus, string> = {
  none: 'bg-slate-100 text-slate-500',
  draft: 'bg-chart-amber/10 text-chart-amber',
  ready: 'bg-info/10 text-info',
  published: 'bg-success/10 text-success',
  withdrawn: 'bg-danger/10 text-danger',
};
const CONSENT_METHOD_LABEL: Record<CompendiumConsentMethod, string> = {
  submission_terms: 'Submission terms',
  email: 'Email',
  form: 'Form',
  other: 'Other',
};

// Mirrors confirmedAbstract.controller.ts's isCompendiumReady / ALLOWED_FROM
// exactly, purely for instant UI feedback — the server re-checks both for
// real on every request and is the only thing that actually enforces them.
const isReady = (a: AdminConfirmedAbstract): boolean =>
  !!a.title?.trim() && !!a.authors?.length && !!a.abstractText?.trim() && !!a.track?.trim();
const hasConsent = (a: AdminConfirmedAbstract): boolean => !!a.compendium?.consentToPublish?.granted;
const ALLOWED_FROM: Record<CompendiumPublicationStatus, CompendiumPublicationStatus[]> = {
  none: [],
  draft: ['none'],
  ready: ['none', 'draft'],
  published: ['ready'],
  withdrawn: ['ready', 'published'],
};

const ReadinessDot = ({ ok, label }: { ok: boolean; label: string }) => (
  <span title={label} className={`flex items-center gap-1 ${ok ? 'text-success' : 'text-slate-300'}`}>
    {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
  </span>
);

interface EditState {
  track: string;
  keywords: string; // comma-separated in the UI, split/joined on save
  authors: CompendiumAuthor[];
  abstractText: string;
}

// Open-access compendium: readiness, consent, and publication status for the
// same ConfirmedAbstract records the Presenters tab manages — a separate
// slice of fields (abstract body, structured authors, consent, status) for
// the compendium project, not the "confirmed presenters" showcase page.
export const CompendiumTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminConfirmedAbstract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompendiumPublicationStatus | ''>('');
  const [tracks, setTracks] = useState<PublicTrack[] | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [consentTarget, setConsentTarget] = useState<'bulk' | AdminConfirmedAbstract | null>(null);
  const [consentMethod, setConsentMethod] = useState<CompendiumConsentMethod>('submission_terms');
  const [consentNote, setConsentNote] = useState('');
  const [consentSaving, setConsentSaving] = useState(false);

  const [editing, setEditing] = useState<AdminConfirmedAbstract | null>(null);
  const [editForm, setEditForm] = useState<EditState>({ track: '', keywords: '', authors: [], abstractText: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [previewing, setPreviewing] = useState<AdminConfirmedAbstract | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  useEffect(() => {
    listTracks()
      .then(setTracks)
      .catch(() => setTracks([]));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListConfirmedAbstracts({ q: q || undefined, page: 1, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  const visible = useMemo(() => {
    if (!statusFilter) return items;
    return items.filter((a) => (a.compendium?.publicationStatus ?? 'none') === statusFilter);
  }, [items, statusFilter]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openConsent = (target: 'bulk' | AdminConfirmedAbstract) => {
    setConsentTarget(target);
    setConsentMethod('submission_terms');
    setConsentNote('');
  };

  const submitConsent = async () => {
    if (!consentTarget) return;
    if (consentNote.trim().length < 10) {
      toast('error', 'Describe how/when consent was obtained (at least 10 characters).');
      return;
    }
    setConsentSaving(true);
    try {
      if (consentTarget === 'bulk') {
        const { recorded, failed } = await adminBulkRecordConsent({
          ids: [...selected],
          method: consentMethod,
          evidenceNote: consentNote.trim(),
        });
        toast('success', `Consent recorded for ${recorded} record${recorded === 1 ? '' : 's'}${failed ? ` (${failed} failed)` : ''}.`);
        setSelected(new Set());
      } else {
        const updated = await adminRecordConsent(consentTarget._id, { method: consentMethod, evidenceNote: consentNote.trim() });
        setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
        toast('success', 'Consent recorded.');
      }
      setConsentTarget(null);
      if (consentTarget === 'bulk') load();
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setConsentSaving(false);
    }
  };

  const changeStatus = async (abstract: AdminConfirmedAbstract, target: CompendiumPublicationStatus) => {
    setStatusBusyId(abstract._id);
    try {
      const updated = await adminSetCompendiumStatus(abstract._id, target);
      setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      toast('success', `Marked "${STATUS_LABEL[target]}".`);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setStatusBusyId(null);
    }
  };

  const openEdit = (abstract: AdminConfirmedAbstract) => {
    setEditing(abstract);
    setEditForm({
      track: abstract.track ?? '',
      keywords: (abstract.keywords ?? []).join(', '),
      authors: abstract.authors && abstract.authors.length > 0 ? abstract.authors : [{ name: abstract.authorName }],
      abstractText: abstract.abstractText ?? '',
    });
    setEditError('');
  };

  const updateAuthor = (idx: number, patch: Partial<CompendiumAuthor>) => {
    setEditForm((prev) => ({ ...prev, authors: prev.authors.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }));
  };
  const removeAuthor = (idx: number) => {
    setEditForm((prev) => ({ ...prev, authors: prev.authors.filter((_, i) => i !== idx) }));
  };
  const addAuthor = () => {
    setEditForm((prev) => ({ ...prev, authors: [...prev.authors, { name: '' }] }));
  };

  const submitEdit = async () => {
    if (!editing) return;
    const authors = editForm.authors.map((a) => ({ ...a, name: a.name.trim() })).filter((a) => a.name.length > 0);
    if (authors.length === 0) {
      setEditError('At least one author is required.');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await adminUpdateConfirmedAbstract(editing._id, {
        track: editForm.track || undefined,
        keywords: editForm.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        authors,
        abstractText: editForm.abstractText.trim() || undefined,
      });
      setItems((prev) => prev.map((i) => (i._id === updated._id ? updated : i)));
      toast('success', 'Saved.');
      setEditing(null);
    } catch (err) {
      setEditError(getApiErrorMessage(err));
    } finally {
      setEditSaving(false);
    }
  };

  const readyCount = items.filter((a) => (a.compendium?.publicationStatus ?? 'none') === 'ready' || a.compendium?.publicationStatus === 'published').length;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {items.length} abstract{items.length === 1 ? '' : 's'} &middot; {readyCount} ready or published &middot; consent and status never change
          without an explicit action here
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by author, title, or code..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CompendiumPublicationStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {COMPENDIUM_PUBLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="sticky top-[4.5rem] z-20 mt-4 flex items-center gap-3 rounded-lg border border-orange/30 bg-orange/5 px-4 py-2.5"
          >
            <span className="text-[13px] font-semibold text-navy">{selected.size} selected</span>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy hover:border-orange/40"
              >
                Clear
              </button>
              <button
                onClick={() => openConsent('bulk')}
                className="flex items-center gap-1.5 rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-hover"
              >
                <ShieldCheck size={13} /> Record Consent
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <SkeletonRows rows={6} cols={6} />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && selected.size === visible.length}
                      onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((i) => i._id)) : new Set())}
                      className="h-4 w-4 rounded border-slate-300 text-orange focus:ring-orange/40"
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Abstract</th>
                  <th className="px-3 py-3 font-semibold">Readiness</th>
                  <th className="px-3 py-3 font-semibold">Consent</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((a) => {
                  const status = a.compendium?.publicationStatus ?? 'none';
                  const ready = isReady(a);
                  const consented = hasConsent(a);
                  const nextTargets = COMPENDIUM_PUBLICATION_STATUSES.filter((s) => ALLOWED_FROM[s].includes(status));
                  return (
                    <tr key={a._id} className="align-top">
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(a._id)}
                          onChange={() => toggleSelected(a._id)}
                          className="h-4 w-4 rounded border-slate-300 text-orange focus:ring-orange/40"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-navy">{a.code}</p>
                        <p className="max-w-sm truncate text-xs text-slate-400">{a.title}</p>
                        <p className="text-xs text-slate-400">{a.track ?? <span className="italic text-danger/70">No track</span>}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <ReadinessDot ok={!!a.title?.trim()} label="Title" />
                          <ReadinessDot ok={!!a.authors?.length} label="Authors" />
                          <ReadinessDot ok={!!a.abstractText?.trim()} label="Body text" />
                          <ReadinessDot ok={!!a.track?.trim()} label="Track" />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {consented ? (
                          <span
                            title={a.compendium?.consentToPublish?.evidenceNote}
                            className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success"
                          >
                            {CONSENT_METHOD_LABEL[a.compendium!.consentToPublish!.method!]}
                          </span>
                        ) : (
                          <button
                            onClick={() => openConsent(a)}
                            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-orange/10 hover:text-orange"
                          >
                            Not recorded
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[status]}`}>
                            {STATUS_LABEL[status]}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {nextTargets.map((target) => {
                              const blockedReason =
                                target === 'ready' && !ready
                                  ? 'Missing title, authors, body text, or track'
                                  : target === 'ready' && !consented
                                    ? 'Consent must be recorded first'
                                    : undefined;
                              return (
                                <button
                                  key={target}
                                  disabled={!!blockedReason || statusBusyId === a._id}
                                  title={blockedReason}
                                  onClick={() => changeStatus(a, target)}
                                  className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-navy hover:border-orange/40 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  {target === 'ready' ? 'Mark Ready' : target === 'published' ? 'Publish' : target === 'withdrawn' ? 'Withdraw' : 'Start Draft'}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => setPreviewing(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy" title="Preview">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => openEdit(a)} className="rounded-md p-1.5 text-slate-400 hover:bg-offwhite hover:text-navy" title="Edit">
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Consent modal — single or bulk, same shape as PaymentsPage's custom
          mark-paid-with-note modal (ConfirmDialog has no text input). */}
      <AnimatePresence>
        {consentTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
            onClick={() => !consentSaving && setConsentTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/10 text-success">
                <ShieldCheck size={20} />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold text-navy">Record consent to publish</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {consentTarget === 'bulk'
                  ? `Applies the same method and note to all ${selected.size} selected records.`
                  : `For "${consentTarget.title}".`}{' '}
                This is never inferred or defaulted — describe specifically how/when it was obtained.
              </p>
              <div className="mt-4 space-y-3">
                <AdminSelect
                  label="Method"
                  value={consentMethod}
                  onChange={(e) => setConsentMethod(e.target.value as CompendiumConsentMethod)}
                >
                  {COMPENDIUM_CONSENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {CONSENT_METHOD_LABEL[m]}
                    </option>
                  ))}
                </AdminSelect>
                <AdminTextarea
                  label="Evidence note"
                  placeholder='e.g. "Submission terms v1, accepted at submission"'
                  value={consentNote}
                  onChange={(e) => setConsentNote(e.target.value)}
                  maxLength={500}
                />
              </div>
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={() => setConsentTarget(null)}
                  disabled={consentSaving}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-semibold text-navy hover:bg-offwhite"
                >
                  Cancel
                </button>
                <button
                  onClick={submitConsent}
                  disabled={consentSaving || consentNote.trim().length < 10}
                  className="flex-1 rounded-lg bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {consentSaving ? 'Please wait…' : 'Record Consent'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit drawer — track/keywords/authors/abstract body. Title and
          authorName (the Presenters tab's own display name) are intentionally
          not editable here; that stays the Presenters tab's job. */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Edit {editing.code}</p>
                <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {editError && <Banner variant="error">{editError}</Banner>}

                <AdminSelect label="Track" value={editForm.track} onChange={(e) => setEditForm((p) => ({ ...p, track: e.target.value }))} disabled={!tracks}>
                  <option value="">Unassigned</option>
                  {tracks?.map((t) => (
                    <option key={t._id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </AdminSelect>

                <AdminInput
                  label="Keywords (comma-separated)"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm((p) => ({ ...p, keywords: e.target.value }))}
                  placeholder="e.g. machine learning, imbalanced data"
                />

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-navy">Authors</span>
                    <button onClick={addAuthor} className="flex items-center gap-1 text-xs font-semibold text-orange hover:text-orange-hover">
                      <Plus size={13} /> Add author
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editForm.authors.map((author, idx) => (
                      <div key={idx} className="flex gap-2 rounded-lg border border-slate-200 p-2.5">
                        <div className="flex-1 space-y-1.5">
                          <input
                            value={author.name}
                            onChange={(e) => updateAuthor(idx, { name: e.target.value })}
                            placeholder="Name"
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
                          />
                          <input
                            value={author.affiliation ?? ''}
                            onChange={(e) => updateAuthor(idx, { affiliation: e.target.value || undefined })}
                            placeholder="Affiliation (optional — not in the source document)"
                            className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
                          />
                        </div>
                        <button onClick={() => removeAuthor(idx)} className="self-start rounded-md p-1.5 text-slate-400 hover:bg-danger/10 hover:text-danger">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <AdminTextarea
                  label="Abstract body"
                  value={editForm.abstractText}
                  onChange={(e) => setEditForm((p) => ({ ...p, abstractText: e.target.value }))}
                  maxLength={6000}
                  className="min-h-[220px]"
                />
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submitEdit}
                  disabled={editSaving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview — a plain reading-style rendering, not the real public
          design (that doesn't exist until Phase 6). Rendered inside the
          already-authenticated admin SPA, which robots.txt already excludes
          wholesale (Disallow: /admin), so there's no separate noindex tag to
          add here — the admin area as a whole is already never indexed. */}
      <AnimatePresence>
        {previewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/60 p-4"
            onClick={() => setPreviewing(null)}
          >
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
              <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-6 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-warning">Preview — not published</p>
                <button onClick={() => setPreviewing(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>
              <div className="px-8 py-8">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{previewing.code}</p>
                <h1 className="mt-1.5 font-display text-2xl font-semibold leading-tight text-navy">{previewing.title}</h1>
                <p className="mt-3 text-sm text-slate-600">
                  {(previewing.authors ?? []).map((a) => a.name).join(', ') || previewing.authorName}
                </p>
                {previewing.track && <p className="mt-1 text-xs font-semibold text-orange">{previewing.track}</p>}
                {!!previewing.keywords?.length && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {previewing.keywords.map((k) => (
                      <span key={k} className="rounded-full bg-offwhite px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-6 max-w-[65ch] whitespace-pre-wrap text-[15px] leading-[1.7] text-navy">
                  {previewing.abstractText || <span className="italic text-slate-400">No abstract body yet.</span>}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
