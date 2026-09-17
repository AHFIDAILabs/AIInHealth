import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X, CalendarDays, Pencil, Trash2, AlertTriangle, Search, Ban } from 'lucide-react';
import {
  adminListSessions,
  adminCreateSession,
  adminUpdateSession,
  adminDeleteSession,
  adminCheckConflict,
  adminAddSessionRsvp,
  adminRemoveSessionRsvp,
  SESSION_DAYS,
  SESSION_FORMATS,
  type AdminSession,
  type SessionInput,
  type SessionDay,
} from '../../../services/session.service';
import { adminListSpeakers, type AdminSpeaker } from '../../../services/speaker.service';
import { adminListTracks, type AdminTrack } from '../../../services/track.service';
import { getApiErrorMessage } from '../../../services/api';
import { SkeletonRows } from '../../../components/ui/Skeleton';
import { Banner } from '../../../components/ui/Banner';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AdminInput, AdminTextarea, AdminSelect, AdminToggle } from '../../../components/ui/AdminField';
import { useToast } from '../../../contexts/ToastContext';

const EMPTY_FORM: SessionInput = {
  day: 'day1',
  startTime: '09:00',
  endTime: '10:00',
  title: '',
  track: null,
  format: SESSION_FORMATS[0],
  room: '',
  description: '',
  speakers: [],
  isPublished: false,
  requiresRsvp: false,
  maxAttendees: undefined,
};

const DAY_LABEL: Record<SessionDay, string> = { day1: 'Day 1 — 19 Oct', day2: 'Day 2 — 20 Oct' };

// The Summit only ever runs these two real calendar days (see
// jobs/sessionReminder.job.ts's own DAY_DATES, kept in sync with this) — the
// admin form shows a real date picker (matching the reference layout) rather
// than exposing "day1"/"day2" as raw values, but under the hood it's still
// the same two-day enum every other part of the app (public Agenda's day
// switcher, the reminder cron, conflict detection) is built around.
const DAY_TO_DATE: Record<SessionDay, string> = { day1: '2026-10-19', day2: '2026-10-20' };
const DATE_TO_DAY: Record<string, SessionDay> = { '2026-10-19': 'day1', '2026-10-20': 'day2' };

export const SessionsListTab = () => {
  const toast = useToast();
  const [items, setItems] = useState<AdminSession[]>([]);
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [speakers, setSpeakers] = useState<AdminSpeaker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dayFilter, setDayFilter] = useState<SessionDay | ''>('');
  const [trackFilter, setTrackFilter] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSession | null>(null);
  const [form, setForm] = useState<SessionInput>(EMPTY_FORM);
  const [speakerQuery, setSpeakerQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [conflictWarning, setConflictWarning] = useState<{ title: string; startTime: string; endTime: string }[]>([]);

  const [toDelete, setToDelete] = useState<AdminSession | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [rsvpEmailsText, setRsvpEmailsText] = useState('');
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [rsvpRemovingEmail, setRsvpRemovingEmail] = useState<string | null>(null);
  const [rsvpError, setRsvpError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListSessions({ day: dayFilter || undefined, track: trackFilter || undefined, limit: 200 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [dayFilter, trackFilter]);

  useEffect(load, [load]);
  useEffect(() => {
    adminListSpeakers({ limit: 100 }).then((res) => setSpeakers(res.items)).catch(() => {});
    adminListTracks().then(setTracks).catch(() => {});
  }, []);

  // Live conflict check while day/room/time fields are filled in — inline warning
  // before save, per the Phase 1 checklist ("Time/room conflict warning on save").
  useEffect(() => {
    if (!formOpen || !form.room.trim() || !form.day || !form.startTime || !form.endTime) {
      setConflictWarning([]);
      return;
    }
    const id = setTimeout(() => {
      adminCheckConflict({
        day: form.day,
        room: form.room,
        startTime: form.startTime,
        endTime: form.endTime,
        excludeId: editing?._id,
      })
        .then((res) => setConflictWarning(res.conflicts))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(id);
  }, [formOpen, form.day, form.room, form.startTime, form.endTime, editing]);

  const grouped = useMemo(() => {
    const map = new Map<SessionDay, AdminSession[]>();
    for (const day of SESSION_DAYS) map.set(day, []);
    items.forEach((s) => map.get(s.day)?.push(s));
    return map;
  }, [items]);

  const filteredSpeakerOptions = useMemo(() => {
    const q = speakerQuery.trim().toLowerCase();
    return speakers.filter((s) => !q || s.fullName.toLowerCase().includes(q));
  }, [speakers, speakerQuery]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setConflictWarning([]);
    setRsvpEmailsText('');
    setRsvpError('');
    setFormOpen(true);
  };

  const openEdit = (session: AdminSession) => {
    setEditing(session);
    setForm({
      day: session.day,
      startTime: session.startTime,
      endTime: session.endTime,
      title: session.title,
      track: session.track?._id ?? null,
      format: session.format,
      room: session.room,
      description: session.description ?? '',
      speakers: session.speakers.map((s) => s._id),
      isPublished: session.isPublished,
      requiresRsvp: session.requiresRsvp ?? false,
      maxAttendees: session.maxAttendees,
    });
    setRsvpEmailsText('');
    setRsvpError('');
    setFormError('');
    setConflictWarning([]);
    setFormOpen(true);
  };

  const toggleSpeaker = (id: string) => {
    setForm((prev) => {
      const current = prev.speakers ?? [];
      return { ...prev, speakers: current.includes(id) ? current.filter((s) => s !== id) : [...current, id] };
    });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.room.trim()) {
      setFormError('Title and room are required.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError('End time must be after start time.');
      return;
    }
    setSaving(true);
    setFormError('');
    // Capacity is one plain field in this form (matching the reference layout);
    // requiresRsvp is just derived from whether it's set, rather than a
    // separate toggle — the backend still enforces "requiresRsvp needs a
    // maxAttendees", this just keeps the two permanently in sync from here.
    const payload: SessionInput = { ...form, requiresRsvp: !!form.maxAttendees };
    try {
      if (editing) {
        const { session, conflicts } = await adminUpdateSession(editing._id, payload);
        setItems((prev) => prev.map((s) => (s._id === editing._id ? session : s)));
        toast(conflicts.length ? 'error' : 'success', conflicts.length ? `Saved, but overlaps ${conflicts.length} other session(s) in this room` : 'Session updated');
      } else {
        const { session, conflicts } = await adminCreateSession(payload);
        setItems((prev) => [...prev, session]);
        toast(conflicts.length ? 'error' : 'success', conflicts.length ? `Saved, but overlaps ${conflicts.length} other session(s) in this room` : 'Session added');
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (session: AdminSession) => {
    try {
      const { session: updated } = await adminUpdateSession(session._id, { isPublished: !session.isPublished });
      setItems((prev) => prev.map((s) => (s._id === session._id ? updated : s)));
      toast('success', updated.isPublished ? 'Session published' : 'Session unpublished');
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminDeleteSession(toDelete._id);
      setItems((prev) => prev.filter((s) => s._id !== toDelete._id));
      toast('success', `"${toDelete.title}" removed`);
      setToDelete(null);
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const rsvpEmails = rsvpEmailsText
    .split(/[\n,]/)
    .map((e) => e.trim())
    .filter(Boolean);

  const addRsvpEmails = async () => {
    if (!editing || rsvpEmails.length === 0) return;
    setRsvpSaving(true);
    setRsvpError('');
    try {
      const updated = await adminAddSessionRsvp(editing._id, rsvpEmails);
      setEditing(updated);
      setItems((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
      setRsvpEmailsText('');
      toast('success', `${rsvpEmails.length} email${rsvpEmails.length === 1 ? '' : 's'} added to the RSVP list`);
    } catch (err) {
      setRsvpError(getApiErrorMessage(err));
    } finally {
      setRsvpSaving(false);
    }
  };

  const removeRsvpEmail = async (email: string) => {
    if (!editing) return;
    setRsvpRemovingEmail(email);
    try {
      const updated = await adminRemoveSessionRsvp(editing._id, email);
      setEditing(updated);
      setItems((prev) => prev.map((s) => (s._id === updated._id ? updated : s)));
    } catch (err) {
      toast('error', getApiErrorMessage(err));
    } finally {
      setRsvpRemovingEmail(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">{items.length} session{items.length === 1 ? '' : 's'}</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-orange px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:bg-orange-hover"
        >
          <Plus size={16} /> Add Session
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value as SessionDay | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Days</option>
          {SESSION_DAYS.map((d) => (
            <option key={d} value={d}>
              {DAY_LABEL[d]}
            </option>
          ))}
        </select>
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Tracks</option>
          {tracks.map((t) => (
            <option key={t._id} value={t._id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {loading ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
          <SkeletonRows rows={6} cols={5} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-violet/15 text-chart-violet">
            <CalendarDays size={22} />
          </span>
          <p className="mt-4 font-semibold text-navy">No sessions created yet</p>
          <button onClick={openCreate} className="mt-3 rounded-xl bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange-hover">
            Add Session
          </button>
        </div>
      ) : (
        (dayFilter ? [dayFilter] : SESSION_DAYS).map((day) => {
          const daySessions = grouped.get(day) ?? [];
          if (daySessions.length === 0) return null;
          return (
            <div key={day} className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{DAY_LABEL[day]}</p>
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Time</th>
                        <th className="px-3 py-3 font-semibold">Session</th>
                        <th className="px-3 py-3 font-semibold">Room</th>
                        <th className="px-3 py-3 font-semibold">Speakers</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-3 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daySessions.map((s) => (
                        <tr key={s._id} className={!s.isPublished ? 'opacity-70' : ''}>
                          <td className="px-4 py-3 font-medium text-navy">
                            {s.startTime}&ndash;{s.endTime}
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-navy">{s.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {s.track ? (
                                <span
                                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                                  style={{ backgroundColor: `${s.track.color}1A`, color: s.track.color }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.track.color }} />
                                  {s.track.name}
                                </span>
                              ) : (
                                <span className="rounded-full bg-offwhite px-2 py-0.5 text-[10px] font-medium text-slate-400">No track</span>
                              )}
                              <span className="rounded-full bg-offwhite px-2 py-0.5 text-[10px] font-medium text-slate-500">{s.format}</span>
                              {s.requiresRsvp && (
                                <span className="rounded-full bg-chart-violet/15 px-2 py-0.5 text-[10px] font-semibold text-chart-violet">
                                  RSVP {s.rsvpList?.length ?? 0}/{s.maxAttendees ?? '—'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-500">{s.room}</td>
                          <td className="px-3 py-3">
                            <div className="flex -space-x-2">
                              {s.speakers.slice(0, 4).map((sp) => (
                                <span
                                  key={sp._id}
                                  title={sp.fullName}
                                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-navy text-[10px] font-semibold text-white"
                                >
                                  {sp.photoUrl ? (
                                    <img src={sp.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                                  ) : (
                                    sp.fullName[0]
                                  )}
                                </span>
                              ))}
                              {s.speakers.length === 0 && <span className="text-xs text-slate-300">&mdash;</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => togglePublish(s)}
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                s.isPublished ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {s.isPublished ? 'Published' : 'Draft'}
                            </button>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => openEdit(s)} className="rounded-md p-2 text-slate-400 hover:bg-offwhite hover:text-navy">
                                <Pencil size={15} />
                              </button>
                              <button onClick={() => setToDelete(s)} className="rounded-md p-2 text-slate-400 hover:bg-danger/10 hover:text-danger">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Create/Edit slide-over */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-navy/50"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <p className="font-display text-lg font-semibold text-navy">{editing ? 'Edit Session' : 'Add Session'}</p>
                  <p className="text-xs text-slate-500">{editing ? "Update this session's details." : 'Create a new session in the agenda.'}</p>
                </div>
                <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-navy">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {formError && <Banner variant="error">{formError}</Banner>}

                <AdminInput label="Session Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Opening Keynote" />

                <div className="grid grid-cols-2 gap-3">
                  <AdminSelect label="Track" value={form.track ?? ''} onChange={(e) => setForm({ ...form, track: e.target.value || null })}>
                    <option value="">No track</option>
                    {tracks.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </AdminSelect>
                  <AdminSelect label="Session Type" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as SessionInput['format'] })}>
                    {SESSION_FORMATS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <AdminInput label="Room" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Ballroom A" />

                <AdminInput
                  label="Date *"
                  type="date"
                  min={DAY_TO_DATE.day1}
                  max={DAY_TO_DATE.day2}
                  value={DAY_TO_DATE[form.day]}
                  onChange={(e) => setForm({ ...form, day: DATE_TO_DAY[e.target.value] ?? form.day })}
                />
                <p className="-mt-2.5 text-xs text-slate-400">{DAY_LABEL[form.day]} — the Summit's two confirmed days.</p>

                <div className="grid grid-cols-2 gap-3">
                  <AdminInput label="Start Time *" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                  <AdminInput label="End Time *" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>

                {conflictWarning.length > 0 && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-[13px] text-warning">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Room/time conflict</p>
                      <p className="mt-0.5">
                        Overlaps with: {conflictWarning.map((c) => `${c.title} (${c.startTime}–${c.endTime})`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <AdminTextarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Session details..." />

                <div>
                  <AdminInput
                    label="Capacity"
                    type="number"
                    min={1}
                    value={form.maxAttendees ?? ''}
                    onChange={(e) => setForm({ ...form, maxAttendees: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Leave blank for unlimited. Setting a number opens self-service RSVP for this session.</p>
                </div>

                <div>
                  <p className="mb-1.5 text-[13px] font-semibold text-navy">Speakers</p>
                  <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={speakerQuery}
                      onChange={(e) => setSpeakerQuery(e.target.value)}
                      placeholder="Search speakers..."
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                    {filteredSpeakerOptions.map((sp) => {
                      const selected = form.speakers?.includes(sp._id);
                      return (
                        <button
                          key={sp._id}
                          onClick={() => toggleSpeaker(sp._id)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] hover:bg-offwhite ${selected ? 'bg-orange/5' : ''}`}
                        >
                          <span className="min-w-0 truncate text-navy">
                            {sp.fullName}
                            {sp.title && <span className="text-slate-400"> — {sp.title}</span>}
                          </span>
                          {selected && <span className="shrink-0 text-orange">✓</span>}
                        </button>
                      );
                    })}
                    {filteredSpeakerOptions.length === 0 && <p className="px-3 py-3 text-xs text-slate-400">No speakers found</p>}
                  </div>
                </div>

                <AdminToggle
                  label="Visible on Website"
                  checked={!!form.isPublished}
                  onChange={(v) => setForm({ ...form, isPublished: v })}
                />
                <p className="-mt-2.5 text-xs text-slate-400">Show on the public event site.</p>

                {editing && !!form.maxAttendees && (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-semibold text-navy">RSVP List</p>
                      <span className="text-xs font-medium text-slate-500">
                        {editing.rsvpList?.length ?? 0} / {form.maxAttendees ?? '—'}
                      </span>
                    </div>

                    {rsvpError && (
                      <p className="mt-2 text-xs font-medium text-danger">{rsvpError}</p>
                    )}

                    <div className="mt-3">
                      <AdminTextarea
                        label="Add Emails"
                        value={rsvpEmailsText}
                        onChange={(e) => setRsvpEmailsText(e.target.value)}
                        placeholder={'One VIP, or a whole pasted batch — one per line or comma-separated:\nvip@example.com\nattendee2@example.com'}
                      />
                      <button
                        onClick={addRsvpEmails}
                        disabled={rsvpSaving || rsvpEmails.length === 0}
                        className="mt-2 w-full rounded-lg bg-navy py-2 text-[13px] font-semibold text-white hover:bg-navy-secondary disabled:opacity-60"
                      >
                        {rsvpSaving ? 'Adding…' : `Add${rsvpEmails.length ? ` (${rsvpEmails.length})` : ''}`}
                      </button>
                    </div>

                    {(editing.rsvpList?.length ?? 0) > 0 && (
                      <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
                        {editing.rsvpList!.map((r) => (
                          <div key={r.email} className="flex items-center justify-between px-3 py-2 text-[13px] hover:bg-offwhite">
                            <div>
                              <span className="text-navy">{r.email}</span>
                              <span className="ml-1.5 rounded-full bg-offwhite px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                                {r.source}
                              </span>
                            </div>
                            <button
                              onClick={() => removeRsvpEmail(r.email)}
                              disabled={rsvpRemovingEmail === r.email}
                              className="rounded-md p-1 text-slate-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                              title="Remove"
                            >
                              <Ban size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2.5 border-t border-slate-100 px-5 py-4">
                <button onClick={() => setFormOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-[13px] font-semibold text-navy hover:bg-offwhite">
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 rounded-lg bg-orange py-2.5 text-[13px] font-semibold text-white hover:bg-orange-hover disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Session'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!toDelete}
        title={`Remove "${toDelete?.title}"?`}
        description="This will remove it from the public Agenda page. This can't be undone."
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
