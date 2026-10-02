import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, RefreshCw, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import {
  adminListKnowledgeProducts,
  adminGenerateKnowledgeProduct,
  adminUpdateKnowledgeProduct,
  type AdminKnowledgeProduct,
  type KnowledgeProductType,
  type KnowledgeProductSection,
} from '../../services/knowledgeProduct.service';
import { getApiErrorMessage } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

// Matches ParticipantsOutcomes.tsx's own titles for these same 5 types —
// keeping the admin-facing label identical to what the public eventually
// sees avoids the two ever drifting apart.
const LABELS: Record<KnowledgeProductType, string> = {
  communique: 'Summit Communiqué',
  proceedings: 'AI in Health Summit Proceedings',
  policyBrief: 'National Policy Brief',
  technicalReport: 'Technical Report',
  actionPlan: 'Action Plan for AI in Health Implementation',
};

const inputSummaryLine = (inputSummary: Record<string, number>): string => {
  const parts = Object.entries(inputSummary).map(([key, count]) => {
    const label = key.replace(/Count$/, '').replace(/([A-Z])/g, ' $1').toLowerCase();
    return `${count} ${label}${count === 1 ? '' : 's'}`;
  });
  return parts.length ? `Drafted from ${parts.join(', ')}` : 'Not generated yet';
};

export const KnowledgeProductsPage = () => {
  const toast = useToast();
  const [products, setProducts] = useState<AdminKnowledgeProduct[] | null>(null);
  const [active, setActive] = useState<AdminKnowledgeProduct | null>(null);
  const [sectionsDraft, setSectionsDraft] = useState<KnowledgeProductSection[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    adminListKnowledgeProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  };
  useEffect(load, []);

  const open = (p: AdminKnowledgeProduct) => {
    setActive(p);
    setSectionsDraft(p.sections);
  };

  const generate = async (type: KnowledgeProductType) => {
    setBusy(true);
    try {
      const updated = await adminGenerateKnowledgeProduct(type);
      toast('success', 'Draft generated.');
      setSectionsDraft(updated.sections);
      setActive(updated);
      load();
    } catch (err) {
      toast('error', getApiErrorMessage(err, 'No approved input material exists yet for this product.'));
      load();
    } finally {
      setBusy(false);
    }
  };

  const saveDraft = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await adminUpdateKnowledgeProduct(active.type, { sections: sectionsDraft });
      toast('success', 'Draft saved.');
      load();
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!active) return;
    setBusy(true);
    try {
      await adminUpdateKnowledgeProduct(active.type, { sections: sectionsDraft, status: 'approved' });
      toast('success', 'Published — now visible on the public Participants & Outcomes page.');
      load();
      setActive(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!products) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Knowledge Products</h1>
        <p className="text-sm text-slate-500">
          AI-assisted first drafts of the Summit's documented outputs, synthesized from approved session reports, policy tracker
          entries, and abstract summaries. Review and approve before anything is published.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="divide-y divide-slate-100">
          {products.map((p) => (
            <button
              key={p.type}
              onClick={() => open(p)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-navy">{LABELS[p.type]}</p>
                <p className="truncate text-xs text-slate-400">{inputSummaryLine(p.inputSummary)}</p>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  p.status === 'approved' ? 'bg-success/10 text-success' : p.generationError ? 'bg-danger/10 text-danger' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p.status === 'approved' ? <CheckCircle2 size={11} /> : p.generationError ? <AlertTriangle size={11} /> : <FileText size={11} />}
                {p.status === 'approved' ? 'Published' : p.generationError ? 'Failed' : p.generatedAt ? 'Draft' : 'Not generated'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setActive(null)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="font-display text-lg font-semibold text-navy">{LABELS[active.type]}</p>
                <button onClick={() => setActive(null)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 text-sm">
                <p className="text-xs text-slate-400">{inputSummaryLine(active.inputSummary)}</p>

                {active.generationError && (
                  <Banner variant="error">Last generation attempt failed: {active.generationError}</Banner>
                )}
                {active.status === 'approved' && (
                  <Banner variant="success">
                    Published {active.approvedAt ? new Date(active.approvedAt).toLocaleString() : ''} — visible on the public
                    Participants &amp; Outcomes page.
                  </Banner>
                )}

                {sectionsDraft.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Nothing generated yet — click Generate below to draft it.</p>
                ) : (
                  sectionsDraft.map((section, i) => (
                    <div key={section.heading}>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {section.heading}
                      </label>
                      <textarea
                        value={section.content}
                        onChange={(e) =>
                          setSectionsDraft((prev) => prev.map((s, idx) => (idx === i ? { ...s, content: e.target.value } : s)))
                        }
                        rows={section.content.length > 400 ? 10 : 5}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none"
                      />
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  onClick={() => void generate(active.type)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange/40 disabled:opacity-50"
                >
                  {active.generatedAt ? <RefreshCw size={13} /> : <Sparkles size={13} />}
                  {active.generatedAt ? 'Regenerate with AI' : 'Generate with AI'}
                </button>
                {sectionsDraft.length > 0 && (
                  <>
                    <button
                      onClick={() => void saveDraft()}
                      disabled={busy}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange/40 disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                    <Button variant="primary" className="ml-auto !px-4 !py-2 !text-xs" loading={busy} onClick={approve}>
                      {active.status === 'approved' ? 'Re-approve' : 'Approve & Publish'}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
