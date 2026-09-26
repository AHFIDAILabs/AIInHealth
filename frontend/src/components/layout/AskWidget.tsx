import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { askConceptNote } from '../../services/ai.service';
import { getApiErrorMessage } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Turn {
  question: string;
  answer: string;
  sources: string[];
}

// "Ask the Concept Note" — a grounded, retrieval-scoped assistant, never an
// open-ended chatbot (see backend's rag.service.ts). Opposite corner from
// FloatingCTA (bottom-right) so the two don't collide.
export const AskWidget = () => {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setQuestion('');
    try {
      // Unlike the rest of the site's translations (pre-generated, admin-
      // reviewed), this one is inherently live — every question is unique,
      // there's nothing to pre-translate. Passing `lang` just tells the
      // backend which language to answer IN; the RAG grounding/safety
      // behavior is unchanged (services/ai/rag.service.ts).
      const result = await askConceptNote(q, lang);
      setTurns((prev) => [...prev, { question: q, answer: result.answer, sources: result.sources }]);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 1.4 }}
        onClick={() => setOpen(true)}
        aria-label={t('askWidget.launcherAria', 'Ask a question about the Summit')}
        className={`fixed bottom-5 left-5 z-40 flex items-center gap-1.5 rounded-full bg-orange py-2.5 px-4 text-[13px] font-semibold text-white shadow-xl shadow-orange/25 transition-transform hover:scale-105 ${open ? 'hidden' : ''}`}
      >
        <Sparkles size={15} /> {t('askWidget.launcherLabel', 'Ask a Question')}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 left-5 z-40 flex max-h-[70vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-96"
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-navy px-4 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
                <Sparkles size={14} className="text-orange" /> {t('askWidget.headerTitle', 'Ask about the Summit')}
              </p>
              <button onClick={() => setOpen(false)} className="text-slate-300 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {turns.length === 0 && (
                <p className="text-[13px] text-slate-500">
                  {t(
                    'askWidget.intro',
                    'Ask about dates, registration, tickets, tracks, or partnership — answered only from official Summit information. For anything else, use the Contact page.'
                  )}
                </p>
              )}
              {turns.map((turn, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="rounded-lg bg-offwhite px-3 py-2 text-[13px] font-medium text-navy">{turn.question}</p>
                  <p className="text-[13px] leading-relaxed text-slate-600">{turn.answer}</p>
                  {turn.sources.length > 0 && (
                    <p className="text-[11px] text-slate-400">
                      {t('askWidget.source', 'Source')}: {turn.sources.join(', ')}
                    </p>
                  )}
                </div>
              ))}
              {error && <p className="text-[12px] text-danger">{error}</p>}
            </div>

            <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-100 p-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t('askWidget.inputPlaceholder', 'Ask a question…')}
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange text-white hover:bg-orange-hover disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
