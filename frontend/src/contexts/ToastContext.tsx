import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastVariant, typeof CheckCircle2> = { success: CheckCircle2, error: XCircle, info: Info };
const COLORS: Record<ToastVariant, string> = {
  success: 'text-success bg-success/10',
  error: 'text-danger bg-danger/10',
  info: 'text-info bg-info/10',
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((variant: ToastVariant, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, variant, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.variant];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-2.5 shadow-lg"
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${COLORS[t.variant]}`}>
                  <Icon size={14} />
                </span>
                <p className="text-[13px] font-medium text-navy">{t.message}</p>
                <button onClick={() => dismiss(t.id)} className="ml-1 text-slate-400 hover:text-navy">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue['toast'] => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
};
