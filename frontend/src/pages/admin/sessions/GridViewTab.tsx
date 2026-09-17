import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { adminListSessions, SESSION_DAYS, type AdminSession, type SessionDay } from '../../../services/session.service';
import { getApiErrorMessage } from '../../../services/api';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';

const DAY_LABEL: Record<SessionDay, string> = { day1: 'Day 1 — 19 Oct', day2: 'Day 2 — 20 Oct' };

// A visual, card-based read of the same sessions SessionsListTab manages —
// no separate CRUD here, just a faster way to scan the whole programme at a
// glance (by day, colored by track). Editing still happens from the List tab.
export const GridViewTab = () => {
  const [items, setItems] = useState<AdminSession[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminListSessions({ limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<SessionDay, AdminSession[]>();
    for (const day of SESSION_DAYS) map.set(day, []);
    (items ?? []).forEach((s) => map.get(s.day)?.push(s));
    for (const list of map.values()) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return map;
  }, [items]);

  if (error) return <Banner variant="error">{error}</Banner>;

  if (items === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-20 text-center">
        <CalendarDays size={28} className="text-slate-300" />
        <p className="mt-3 font-semibold text-navy">No sessions yet</p>
        <p className="mt-1 text-sm text-slate-500">Add sessions from the Sessions List tab to see them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {SESSION_DAYS.map((day) => {
        const daySessions = grouped.get(day) ?? [];
        if (daySessions.length === 0) return null;
        return (
          <div key={day}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{DAY_LABEL[day]}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {daySessions.map((s) => (
                <div
                  key={s._id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4"
                  style={{ borderTopWidth: 4, borderTopColor: s.track?.color ?? '#CBD5E1' }}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Clock size={12} className="text-orange" />
                    {s.startTime}&ndash;{s.endTime}
                  </div>
                  <p className="mt-2 font-display text-sm font-semibold leading-snug text-navy">{s.title}</p>
                  <span
                    className="mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: s.track ? `${s.track.color}1A` : '#F1F5F9', color: s.track?.color ?? '#64748B' }}
                  >
                    {s.track?.name ?? 'No track'}
                  </span>
                  {s.room && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <MapPin size={12} /> {s.room}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex -space-x-2">
                      {s.speakers.slice(0, 4).map((sp) => (
                        <span
                          key={sp._id}
                          title={sp.fullName}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-navy text-[9px] font-semibold text-white"
                        >
                          {sp.photoUrl ? <img src={sp.photoUrl} alt="" className="h-full w-full rounded-full object-cover" /> : sp.fullName[0]}
                        </span>
                      ))}
                      {s.speakers.length === 0 && <span className="text-[11px] text-slate-300">No speakers</span>}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        s.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {s.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
