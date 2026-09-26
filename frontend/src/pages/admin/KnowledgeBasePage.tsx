import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Plus, Trash2, X, Search, Upload, FileText } from 'lucide-react';
import {
  adminListKnowledgeChunks,
  adminCreateKnowledgeChunk,
  adminUpdateKnowledgeChunk,
  adminDeleteKnowledgeChunk,
  extractKnowledgeChunksFromDocument,
  adminBulkCreateKnowledgeChunks,
  type AdminKnowledgeChunk,
} from '../../services/ai.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminToggle } from '../../components/ui/AdminField';
import { useToast } from '../../contexts/ToastContext';

interface ProposedChunkRow {
  sectionHeading: string;
  text: string;
  included: boolean;
}

interface FormState {
  sourceDocument: string;
  sectionHeading: string;
  text: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { sourceDocument: '', sectionHeading: '', text: '', isActive: true };

export const KnowledgeBasePage = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminKnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AdminKnowledgeChunk | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadSourceDocument, setUploadSourceDocument] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [proposedChunks, setProposedChunks] = useState<ProposedChunkRow[] | null>(null);
  const [committing, setCommitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListKnowledgeChunks({ sourceDocument: sourceFilter || undefined, page, limit: 20 })
      .then((res) => {
        setItems(res.items);
        setPages(res.pages);
        setTotal(res.total);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [sourceFilter, page]);

  useEffect(load, [load]);

  const sourceOptions = Array.from(new Set(items.map((i) => i.sourceDocument))).sort();

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (chunk: AdminKnowledgeChunk) => {
    setEditingId(chunk._id);
    setForm({
      sourceDocument: chunk.sourceDocument,
      sectionHeading: chunk.sectionHeading ?? '',
      text: chunk.text,
      isActive: chunk.isActive,
    });
    setFormError('');
    setFormOpen(true);
  };

  const submit = async () => {
    setFormError('');
    if (!form.sourceDocument.trim() || form.text.trim().length < 10) {
      setFormError('Source document and text (at least 10 characters) are required.');
      return;
    }
    setSaving(true);
    try {
      const input = {
        sourceDocument: form.sourceDocument.trim(),
        sectionHeading: form.sectionHeading.trim() || undefined,
        text: form.text.trim(),
        isActive: form.isActive,
      };
      if (editingId) {
        await adminUpdateKnowledgeChunk(editingId, input);
        toast('success', 'Knowledge chunk updated');
      } else {
        await adminCreateKnowledgeChunk(input);
        toast('success', 'Knowledge chunk added');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openUpload = () => {
    setUploadSourceDocument('');
    setUploadFile(null);
    setUploadError('');
    setProposedChunks(null);
    setUploadOpen(true);
  };

  const closeUpload = () => {
    setUploadOpen(false);
    setProposedChunks(null);
  };

  const extract = async () => {
    setUploadError('');
    if (!uploadFile) {
      setUploadError('Choose a file first.');
      return;
    }
    if (!uploadSourceDocument.trim()) {
      setUploadError('Name this source document (e.g. "Concept Note").');
      return;
    }
    setExtracting(true);
    try {
      const result = await extractKnowledgeChunksFromDocument(uploadFile, uploadSourceDocument.trim());
      setProposedChunks(result.chunks.map((c) => ({ sectionHeading: c.sectionHeading ?? '', text: c.text, included: true })));
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setExtracting(false);
    }
  };

  const updateProposedChunk = (index: number, patch: Partial<ProposedChunkRow>) => {
    setProposedChunks((prev) => (prev ? prev.map((c, i) => (i === index ? { ...c, ...patch } : c)) : prev));
  };

  const commitChunks = async () => {
    if (!proposedChunks) return;
    const toCommit = proposedChunks.filter((c) => c.included && c.text.trim().length >= 10);
    if (toCommit.length === 0) {
      setUploadError('Select at least one chunk with real text to add.');
      return;
    }
    setUploadError('');
    setCommitting(true);
    try {
      const result = await adminBulkCreateKnowledgeChunks(
        uploadSourceDocument.trim(),
        toCommit.map((c) => ({ sectionHeading: c.sectionHeading.trim() || undefined, text: c.text.trim() }))
      );
      toast(
        'success',
        `Added ${result.created} chunk${result.created === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
      );
      closeUpload();
      load();
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setCommitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteKnowledgeChunk(toDelete._id);
      setItems((prev) => prev.filter((i) => i._id !== toDelete._id));
      setTotal((prev) => prev - 1);
      toast('success', 'Knowledge chunk removed');
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Knowledge Base</h1>
          <p className="text-sm text-slate-500">
            Source material for "Ask a Question" (the site-wide AI widget) — {total} chunk{total === 1 ? '' : 's'}. Only
            answers from what's written here; nothing outside it.
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <button
            onClick={openUpload}
            className="flex items-center gap-2 rounded-xl border border-orange/30 px-4 py-2.5 text-[13px] font-semibold text-orange hover:bg-orange/5"
          >
            <Upload size={16} /> Upload Document
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
          >
            <Plus size={16} /> Add Chunk
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={sourceFilter}
            onChange={(e) => {
              setPage(1);
              setSourceFilter(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
          >
            <option value="">All Source Documents</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
        {loading ? (
          <SkeletonRows rows={6} cols={3} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/15 text-orange">
              <Sparkles size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No knowledge base content yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Add chunks from your Concept Note, FAQ, or Partnership Prospectus — the "Ask a Question" widget only ever
              answers from what's here.
            </p>
            <div className="mt-3 flex gap-4">
              <button onClick={openUpload} className="text-sm font-semibold text-orange hover:text-orange-hover">
                Upload a document
              </button>
              <button onClick={openAdd} className="text-sm font-semibold text-orange hover:text-orange-hover">
                Add the first chunk
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((chunk) => (
              <div key={chunk._id} className="flex items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEdit(chunk)}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-navy-secondary px-2.5 py-0.5 text-[10px] font-semibold text-orange">
                      {chunk.sourceDocument}
                    </span>
                    {chunk.sectionHeading && <span className="text-[11px] font-medium text-slate-400">{chunk.sectionHeading}</span>}
                    {!chunk.isActive && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">Inactive</span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[13px] text-slate-600">{chunk.text}</p>
                </div>
                <button
                  onClick={() => setToDelete(chunk)}
                  className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-500">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-md border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={() => setFormOpen(false)}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{editingId ? 'Edit Chunk' : 'Add Chunk'}</p>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}
                <AdminInput
                  label="Source Document"
                  placeholder="e.g. Concept Note, FAQ, Partnership Prospectus"
                  value={form.sourceDocument}
                  onChange={(e) => setForm({ ...form, sourceDocument: e.target.value })}
                />
                <AdminInput
                  label="Section Heading (optional)"
                  placeholder="e.g. Dates and Venue"
                  value={form.sectionHeading}
                  onChange={(e) => setForm({ ...form, sectionHeading: e.target.value })}
                />
                <AdminTextarea
                  label="Text"
                  className="min-h-[180px]"
                  placeholder="Paste the actual content the assistant should be able to answer from — a paragraph or two, not the whole document at once."
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                />
                <AdminToggle label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                <p className="text-xs text-slate-400">Re-embedded automatically whenever the text or heading changes.</p>
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button onClick={submit} disabled={saving} className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Chunk'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] bg-navy/50" onClick={closeUpload}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">Upload Document</p>
                <button onClick={closeUpload} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {uploadError && <Banner variant="error">{uploadError}</Banner>}

                {!proposedChunks ? (
                  <>
                    <AdminInput
                      label="Source Document Name"
                      placeholder="e.g. Concept Note, Partnership Prospectus"
                      value={uploadSourceDocument}
                      onChange={(e) => setUploadSourceDocument(e.target.value)}
                    />
                    <div>
                      <p className="mb-1.5 text-[13px] font-semibold text-navy">File</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-lg border border-dashed border-slate-300 px-4 py-6 text-left hover:border-orange/40"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange/10 text-orange">
                          <FileText size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-navy">
                            {uploadFile ? uploadFile.name : 'Choose a PDF, DOCX, TXT, or MD file'}
                          </span>
                          <span className="block text-xs text-slate-400">Up to 15MB</span>
                        </span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.txt,.md"
                        className="hidden"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      Text is extracted and split into proposed chunks for you to review, edit, or remove before anything
                      is saved — nothing here is added automatically.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-slate-500">
                      {proposedChunks.filter((c) => c.included).length} of {proposedChunks.length} chunk
                      {proposedChunks.length === 1 ? '' : 's'} selected from <strong>{uploadSourceDocument}</strong>. Edit
                      or deselect anything before adding.
                    </p>
                    <div className="space-y-3">
                      {proposedChunks.map((chunk, i) => (
                        <div
                          key={i}
                          className={`rounded-xl border p-3 ${chunk.included ? 'border-slate-200 bg-white' : 'border-slate-100 bg-offwhite/60 opacity-60'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-[13px] font-semibold text-navy">
                              <input
                                type="checkbox"
                                checked={chunk.included}
                                onChange={(e) => updateProposedChunk(i, { included: e.target.checked })}
                                className="h-4 w-4 rounded border-slate-300 text-orange focus:ring-orange/40"
                              />
                              Chunk {i + 1}
                            </label>
                            <span className="text-[11px] text-slate-400">{chunk.text.length} chars</span>
                          </div>
                          <input
                            value={chunk.sectionHeading}
                            onChange={(e) => updateProposedChunk(i, { sectionHeading: e.target.value })}
                            placeholder="Section heading (optional)"
                            disabled={!chunk.included}
                            className="mt-2 w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none disabled:opacity-60"
                          />
                          <textarea
                            value={chunk.text}
                            onChange={(e) => updateProposedChunk(i, { text: e.target.value })}
                            disabled={!chunk.included}
                            className="mt-2 min-h-[90px] w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] leading-relaxed text-navy focus:border-orange/40 focus:outline-none disabled:opacity-60"
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                {!proposedChunks ? (
                  <>
                    <button onClick={closeUpload} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                      Cancel
                    </button>
                    <button
                      onClick={extract}
                      disabled={extracting}
                      className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                    >
                      {extracting ? 'Extracting…' : 'Extract Chunks'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setProposedChunks(null)}
                      className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite"
                    >
                      Back
                    </button>
                    <button
                      onClick={commitChunks}
                      disabled={committing}
                      className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                    >
                      {committing
                        ? 'Adding…'
                        : `Add ${proposedChunks.filter((c) => c.included).length} Chunk${proposedChunks.filter((c) => c.included).length === 1 ? '' : 's'}`}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this chunk?"
        description="It will no longer be used to answer questions. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
