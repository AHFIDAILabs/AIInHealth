import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PostEventHero } from '../../features/recap/components/PostEventHero';
import { AlbumGrid, useAlbumIndex } from '../../features/gallery';
import { VideoEmbed } from '../../design-system/primitives';
import { ButtonLink } from '../../components/ui/Button';
import { loadCompendium } from '../../services/compendium.service';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';
import { useAlbum } from '../../features/gallery';
import { SEO } from '../../components/seo/SEO';

const VIDEOS_ALBUM_ID = '72177720336311834';

// Section 8.2's home, in the order it specifies. "What came out of it,"
// "The summit in numbers," "Innovators and award winners" and "Voices" are
// all omitted — each needs owner-supplied content (content/2026/recap.ts,
// awards.ts, verified quotes) that hasn't been provided yet. Per the
// brief's own "no fabricated content" rule, they render nothing rather than
// a placeholder that looks like real data, and get added the moment that
// content exists — no further code changes needed here.
export const PostEventHome = () => {
  const navigate = useNavigate();
  const { albums } = useAlbumIndex();
  const { photos: videos } = useAlbum(VIDEOS_ALBUM_ID);
  const [abstractCount, setAbstractCount] = useState<number | null>(null);
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);

  useEffect(() => {
    loadCompendium()
      .then(({ abstracts }) => setAbstractCount(abstracts.length))
      .catch(() => undefined);
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  const previewAlbums = (albums ?? []).filter((a) => a.day !== 'special').slice(0, 8);

  return (
    <>
      <SEO title="AI in Health Summit 2026" titleIsFull description="19–20 October 2026, Abuja — what happened at the AI in Health Summit, and how to stay in touch for 2027." path="/" />
      <PostEventHero />

      {/* Compendium feature */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">Open Access Compendium</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">
            {abstractCount !== null ? `${abstractCount} abstracts, open to everyone` : 'Every accepted abstract, open to everyone'}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
            Search by author, track or keyword — no sign-in, no paywall. Every abstract accepted at the Summit, published in full.
          </p>
          <div className="mt-6">
            <ButtonLink to="/compendium" variant="primary">Browse the compendium</ButtonLink>
          </div>
        </div>
      </section>

      {/* Sessions in pictures */}
      {previewAlbums.length > 0 && (
        <section className="bg-offwhite py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-orange">Sessions in Pictures</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Day 1, Day 2, and the special sessions</h2>
              </div>
              <ButtonLink to="/2026/gallery" variant="secondary" className="hidden sm:inline-flex">
                View all <ArrowRight size={15} className="ml-1.5" />
              </ButtonLink>
            </div>
            <div className="mt-8">
              <AlbumGrid albums={previewAlbums} onOpen={(album) => navigate(`/2026/gallery/${album.id}`)} />
            </div>
            <div className="mt-6 text-center sm:hidden">
              <ButtonLink to="/2026/gallery" variant="secondary">View all sessions</ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* Highlight videos */}
      {videos && videos.length > 0 && (
        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Highlight Videos</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Short interviews and highlights</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {videos.slice(0, 4).map((video) => (
                <VideoEmbed key={video.id} provider="flickr" videoId={video.id} posterUrl={video.largeUrl} title={video.title || 'AI in Health Summit 2026'} />
              ))}
            </div>
            {videos.length > 4 && (
              <div className="mt-6 text-center">
                <ButtonLink to="/2026/videos" variant="secondary">Watch all videos</ButtonLink>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Partners — live API, not a static content file: the admin Partners
          CRM is the real source of truth, so reusing it here avoids a second,
          easily-stale copy of the same data. */}
      {partners && partners.length > 0 && (
        <section className="bg-offwhite py-16 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Partners</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {partners.map((p) => (
                <a key={p._id} href={p.website} target="_blank" rel="noopener noreferrer" title={p.name}>
                  {p.logoUrl ? (
                    <img src={p.logoUrl} alt={p.logoAlt ?? p.name} loading="lazy" className="h-10 w-auto object-contain grayscale transition-all hover:grayscale-0" />
                  ) : (
                    <span className="text-sm font-semibold text-slate-500">{p.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Join the 2027 list */}
      <section className="bg-navy py-16 text-center sm:py-20">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">See you in 2027</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">Dates to be announced. Join the list to hear first.</p>
          <div className="mt-6">
            <ButtonLink to="/2027" variant="primary">Join the 2027 list</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
};
