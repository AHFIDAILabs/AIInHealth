import { useEffect, useState } from 'react';
import { HeartHandshake } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { Skeleton } from '../../components/ui/Skeleton';
import { listPublicVolunteers, type PublicVolunteer } from '../../services/volunteer.service';

// Backed by the real GET /volunteers (confirmed + photo-completed only) — a
// volunteer who finishes their portal profile shows up here without a code
// change. No search/filter/modal like Speakers.tsx: there's no bio to drill
// into, just a name, photo, and track.
export const Volunteers = () => {
  const [volunteers, setVolunteers] = useState<PublicVolunteer[] | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    listPublicVolunteers()
      .then(setVolunteers)
      .catch(() => setLoadError('Could not load volunteers right now — please try again shortly.'));
  }, []);

  const noneYet = volunteers !== null && volunteers.length === 0;

  return (
    <>
      <PageHero
        eyebrow="Volunteers"
        title="The Team Making It Happen"
        subtitle="Confirmed volunteers helping run the Summit on the ground in Abuja — guest services, technical support, and more."
      />

      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {loadError ? (
            <Reveal className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <p className="font-display text-lg font-semibold text-navy">{loadError}</p>
            </Reveal>
          ) : volunteers === null ? (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : noneYet ? (
            <Reveal className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
              <HeartHandshake size={32} className="mx-auto text-orange" />
              <p className="mt-4 font-display text-lg font-semibold text-navy">Volunteer profiles coming soon</p>
              <p className="mt-2 text-sm text-slate-500">Confirmed volunteers will appear here as they complete their profile.</p>
            </Reveal>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              {volunteers.map((v, i) => (
                <Reveal key={v.id} delay={i * 0.04}>
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-orange/40 hover:shadow-lg hover:shadow-navy/5">
                    <div className="aspect-square overflow-hidden">
                      {v.avatarUrl ? (
                        <img src={v.avatarUrl} alt={v.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <InitialsAvatar name={v.fullName} className="h-full w-full" />
                      )}
                    </div>
                    <div className="p-3.5 text-center">
                      <p className="font-display text-[14px] font-semibold leading-snug text-navy">{v.fullName}</p>
                      {v.track && <p className="mt-0.5 text-xs leading-snug text-slate-500">{v.track}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          <Reveal className="mt-16 rounded-2xl border border-dashed border-slate-300 bg-offwhite p-8 text-center">
            <p className="font-display text-lg font-semibold text-navy">Want to Volunteer?</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              We&rsquo;re still building the team for guest services, technical support, and event coordination.
            </p>
            <ButtonLink to="/register" variant="secondary" className="!mt-4 !border-slate-300 !bg-white !text-navy !py-2.5 !text-sm">
              Apply to Volunteer
            </ButtonLink>
          </Reveal>
        </div>
      </section>
    </>
  );
};
