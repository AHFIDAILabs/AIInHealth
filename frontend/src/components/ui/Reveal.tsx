import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  children?: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}

// Scroll-triggered fade/slide-up, used to break up the "everything is just there"
// flatness of a static page — sections settle into place as you scroll to them.
export const Reveal = ({ children, className = '', delay = 0, y = 28 }: RevealProps) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.65, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    className={className}
  >
    {children}
  </motion.div>
);
