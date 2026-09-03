import { motion } from 'framer-motion';

interface RevealTextProps {
  text: string;
  className?: string;
  wordDelay?: number;
}

// Word-by-word scroll reveal for a pull-quote-style headline — reads as considered
// motion rather than the whole block just fading in at once.
export const RevealText = ({ text, className = '', wordDelay = 0.028 }: RevealTextProps) => {
  const words = text.split(' ');
  return (
    <p className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: i * wordDelay, ease: 'easeOut' }}
          className="inline-block"
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </p>
  );
};
