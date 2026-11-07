import { Fragment, useCallback, useEffect, useState } from 'react';
import { Search, Download, Building2, Users, GraduationCap, Handshake, ChevronDown, ChevronUp } from 'lucide-react';
import {
  adminListOrganizations,
  exportOrganizationsUrl,
  ORGANIZATION_PARTICIPANT_TYPES,
  type OrganizationGroup,
  type OrganizationsSummary,
  type OrganizationParticipantType,
} from '../../services/organization.service';
import { adminListPartners, type AdminPartner } from '../../services/partner.service';
import { getApiErrorMessage } from '../../services/api';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';
import { AnalyticsStatCard } from './analytics/AnalyticsStatCard';

const TYPE_LABEL: Record<OrganizationParticipantType, string> = {
  attendee: 'Attendee',
  exhibitor: 'Exhibitor',
  sponsor: 'Sponsor',
  volunteer: 'Volunteer',
  innovator: 'Innovator',
};

const TYPE_BADGE_COLOR: Record<OrganizationParticipantType, string> = {
  attendee: 'bg-navy-secondary text-orange',
  exhibitor: 'bg-chart-teal/10 text-chart-teal',
  sponsor: 'bg-warning/10 text-warning',
  volunteer: 'bg-success/10 text-success',
  innovator: 'bg-chart-amber/15 text-chart-amber',
};

// Both halves of "which organizations were involved in the Summit": the
// participant-organization table below is grouped and normalized (case/
// whitespace only — see organization.controller.ts's own comment on why
// true spelling variants like "ABU" aren't auto-merged, to avoid wrongly
// combining two different real organizations); the official Partners &
// Sponsors list is already a clean, admin-curated collection with no
// duplication problem, so it's just read from the existing Partners CRM
// rather than reprocessed.
export const OrganizationsPage = () => {
  const [items, setItems] = useState<OrganizationGroup[]>([]);
  const [summary, setSummary] = useState<OrganizationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState<OrganizationParticipantType | ''>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [partners, setPartners] = useState<AdminPartner[] | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminListOrganizations({ type: type || undefined, q: q || undefined })
      .then((res) => {
        setItems(res.items);
        setSummary(res.summary);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [type, q]);

  useEffect(() => {
    const id = setTimeout(load, q ? 350 : 0);
    return () => clearTimeout(id);
  }, [load, q]);

  useEffect(() => {
    adminListPartners({ limit: 200 })
      .then((res) => setPartners(res.items))
      .catch(() => setPartners([]));
  }, []);

  const toggleExpanded = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy">Organizations</h1>
          <p className="text-sm text-slate-500">Every organization represented at the Summit, across every participant type.</p>
        </div>
        <a
          href={exportOrganizationsUrl({ type: type || undefined, q: q || undefined })}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-navy shadow-sm transition-colors hover:border-orange/40"
        >
          <Download size={15} /> Export CSV
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AnalyticsStatCard icon={Building2} label="Unique Organizations" value={summary?.uniqueOrganizations ?? null} />
        <AnalyticsStatCard icon={Users} label="Total Registrations" value={summary?.totalRegistrations ?? null} />
        <AnalyticsStatCard icon={GraduationCap} label="Attendee Organizations" value={summary?.byType.attendee ?? null} />
        <AnalyticsStatCard icon={Handshake} label="Official Partners & Sponsors" value={partners?.length ?? null} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Grouped by organization name (case/spacing differences merged automatically) — genuinely different spellings or
        abbreviations of the same institution (e.g. "ABU" vs. its full name) still show as separate rows below.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search organizations..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-navy placeholder:text-slate-400 focus:border-orange/40 focus:outline-none"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as OrganizationParticipantType | '')}
          className="rounded-lg border border-slate-200 bg-white py-2 px-3 text-[13px] text-navy focus:border-orange/40 focus:outline-none"
        >
          <option value="">All Participant Types</option>
          {ORGANIZATION_PARTICIPANT_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-4">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        {loading ? (
          <SkeletonRows rows={10} cols={3} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-chart-amber/15 text-chart-amber">
              <Building2 size={22} />
            </span>
            <p className="mt-4 font-semibold text-navy">No organizations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-3 py-3 font-semibold">Participants</th>
                  <th className="px-3 py-3 font-semibold">Types</th>
                  <th className="px-3 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((group) => (
                  <Fragment key={group.displayName}>
                    <tr>
                      <td className="px-4 py-3 font-medium text-navy">{group.displayName}</td>
                      <td className="px-3 py-3 text-slate-600">{group.count}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {group.types.map((t) => (
                            <span key={t} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TYPE_BADGE_COLOR[t]}`}>
                              {TYPE_LABEL[t]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {group.rawVariants.length > 1 && (
                          <button
                            onClick={() => toggleExpanded(group.displayName)}
                            className="flex items-center gap-1 text-[12px] font-semibold text-orange hover:underline"
                          >
                            {group.rawVariants.length} spellings{' '}
                            {expanded.has(group.displayName) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded.has(group.displayName) && group.rawVariants.length > 1 && (
                      <tr className="bg-offwhite/50">
                        <td colSpan={4} className="px-4 py-3 text-[12px] text-slate-500">
                          <span className="font-semibold text-slate-600">As entered: </span>
                          {group.rawVariants.join(' · ')}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">Official Partners &amp; Sponsors</h2>
          <a href="/admin/partners" className="text-[13px] font-semibold text-orange hover:underline">
            Manage in Sponsors &amp; Partners &rarr;
          </a>
        </div>
        {partners === null ? (
          <SkeletonRows rows={4} cols={1} />
        ) : partners.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No partners on file yet.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {partners.map((p) => (
              <span
                key={p._id}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                  p.isPublished ? 'border-slate-200 bg-white text-navy' : 'border-dashed border-slate-300 bg-offwhite text-slate-400'
                }`}
                title={p.isPublished ? undefined : 'Not published on the public site'}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
