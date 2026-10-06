import { useEffect, useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import wia1 from '../../assets/images/WIA.webp';
import wia2 from '../../assets/images/WIA1.webp';
import wia3 from '../../assets/images/WIA2.webp';

// Real photos from AHFID's own past women-in-AI events (AI4SID / International
// Women's Day) — crossfades slowly behind the card below.
const BACKGROUND_IMAGES: string[] = [wia1, wia2, wia3];

const ROTATE_MS = 6000;

// A dedicated homepage spotlight for the Women in AI & Health Breakfast, per
// the concept brief: this opens Day 1 ahead of the main programme and depends
// on real visibility to fill the room, so it gets its own section rather than
// only showing up as one more row inside SummitProgramme's generic session
// list. Static copy (not live session data) since this needs to be promotable
// before the real Session entry even exists in the admin panel.
export const WaiHealthSpotlight = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (BACKGROUND_IMAGES.length < 2) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % BACKGROUND_IMAGES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-navy py-16">
      {BACKGROUND_IMAGES.length > 0 && (
        <div className="absolute inset-0">
          {BACKGROUND_IMAGES.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                i === activeIndex ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Keeps white text legible over any photo while still letting it read through. */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/85 via-navy/75 to-navy/90" />
        </div>
      )}

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center sm:p-12">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange/15 text-orange">
            <Users size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange">
              {t('home.waiHealth.eyebrow', 'Day 1 · 08:00–09:00 · Opens the Summit')}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              {t('home.waiHealth.title', 'Women in AI & Health Breakfast')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t(
                'home.waiHealth.body',
                "A working breakfast for women leaders in AI and health, positioning women's priorities at the very opening of the Summit and feeding directly into the tracks and the closing declaration. Reserved for women leaders across health, technology, research, and innovation."
              )}
            </p>
          </div>
          <ButtonLink to="/wai-health-breakfast" variant="primary">
            {t('home.waiHealth.cta', 'Register for the Breakfast')} <ArrowRight size={16} />
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
};
