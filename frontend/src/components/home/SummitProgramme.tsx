import { useEffect, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { ButtonLink } from '../ui/Button';
import { listPublicSessions, type AdminSession } from '../../services/session.service';

// Mirrors the real site's own empty state verbatim ("No sessions have been
// published yet. Check back soon!") rather than a static fallback timeline —
// once admin publishes real sessions, they replace it automatically.
export const SummitProgramme = () => {
  const [sessions, setSessions] = useState<AdminSession[] | null>(null);

  useEffect(() => {
    listPublicSessions()
      .then((all) => setSessions(all.slice(0, 6)))
      .catch(() => setSessions([]));
  }, []);

  return (
    <section className="bg-offwhite py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">Summit Programme</h2>
          <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-orange" />
        </Reveal>

        {sessions === null ? null : sessions.length === 0 ? (
          <Reveal delay={0.1} className="mt-10 rounded-2xl border border-slate-200 bg-white py-14 text-center">
            <p className="text-sm text-slate-500">No sessions have been published yet. Check back soon!</p>
          </Reveal>
        ) : (
          <div className="mt-10 space-y-3">
            {sessions.map((s, i) => (
              <Reveal key={s._id} delay={i * 0.04}>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    {s.track?.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.track.color }} />}
                    <div>
                      <p className="font-display text-[15px] font-semibold text-navy">{s.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{s.track?.name ?? s.format}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-orange" /> {s.startTime} &ndash; {s.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-orange" /> {s.room}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={0.15} className="mt-8 flex justify-center">
          <ButtonLink to="/agenda" variant="secondary" className="!border-slate-300 !bg-white !text-navy hover:!bg-offwhite">
            View Full Agenda
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
};
