import type { ReactNode } from 'react';
import { CompendiumMosaicBanner } from './CompendiumMosaicBanner';

// The recurring "section opener" treatment from the reference compendium PDF:
// a mosaic banner strip, a small-caps orange eyebrow, a serif heading, an
// italic rust dek line, and a thin orange rule closing the block.
export const CompendiumSectionHeader = ({
  eyebrow,
  title,
  dek,
  seed,
}: {
  eyebrow: string;
  title: ReactNode;
  dek?: ReactNode;
  seed: string;
}) => (
  <div className="bg-white pt-10 sm:pt-12">
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="h-[90px] w-full overflow-hidden sm:h-[110px]">
        <CompendiumMosaicBanner seed={seed} />
      </div>
      <p className="mt-6 font-sans text-xs font-bold uppercase tracking-[0.2em] text-orange">{eyebrow}</p>
      <h1 className="mt-1 font-compendium-serif text-3xl font-bold leading-tight text-compendium-ink sm:text-4xl">{title}</h1>
      {dek && <p className="mt-2 font-compendium-serif text-lg italic text-compendium-rust">{dek}</p>}
      <div className="mt-5 h-px w-full bg-orange/70" />
    </div>
  </div>
);
