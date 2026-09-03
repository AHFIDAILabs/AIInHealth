import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface RegisterSuccessProps {
  message: string;
  onReset: () => void;
}

export const RegisterSuccess = ({ message, onReset }: RegisterSuccessProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center gap-4 px-4 py-14 text-center"
  >
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
      <CheckCircle2 size={32} />
    </span>
    <h3 className="font-display text-xl font-semibold text-navy">You&rsquo;re All Set</h3>
    <p className="max-w-md text-sm leading-relaxed text-slate-600">{message}</p>
    <button onClick={onReset} className="mt-2 text-sm font-semibold text-orange hover:text-orange-hover">
      Submit another response
    </button>
  </motion.div>
);
