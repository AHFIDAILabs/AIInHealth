import { Fragment } from 'react';
import { Check, Minus, ShieldCheck } from 'lucide-react';

type Role =
  | 'super_admin'
  | 'admin'
  | 'registrations_officer'
  | 'innovator_lead'
  | 'exhibitor_lead'
  | 'abstract_lead'
  | 'rapporteur_lead'
  | 'wai_health_lead'
  | 'viewer';

const ROLES: { key: Role; label: string; blurb: string }[] = [
  { key: 'super_admin', label: 'Super Admin', blurb: 'Full access — the only role that manages staff accounts, integrations, and the Security Command Center.' },
  { key: 'admin', label: 'Admin', blurb: 'Full operational access to every area except staff/integrations management.' },
  { key: 'registrations_officer', label: 'Registrations Officer', blurb: 'Owns the registration & payment pipeline (excl. Exhibitors/Innovators) and event-day check-in.' },
  { key: 'innovator_lead', label: 'Innovator Lead', blurb: 'Reviews and manages Innovator registrations only.' },
  { key: 'exhibitor_lead', label: 'Exhibitor Lead', blurb: 'Reviews and manages Exhibitor registrations, stats, and leads only.' },
  { key: 'abstract_lead', label: 'Abstract Lead', blurb: 'Owns abstract review, the rubric, reviewers, and confirmed abstracts.' },
  { key: 'rapporteur_lead', label: 'Rapporteur Lead', blurb: 'Owns rapporteur assignment, reports, and live transcript monitoring.' },
  { key: 'wai_health_lead', label: 'WAI-Health Lead', blurb: 'Owns the Women in AI & Health Breakfast registrations, capacity, and eligibility notices.' },
  { key: 'viewer', label: 'Viewer', blurb: 'Read-only — dashboards, registrations, and the audit log.' },
];

interface Row {
  area: string;
  access: Partial<Record<Role, 'full' | 'view' | 'none'>>;
}

const FULL_ALL: Row['access'] = {
  super_admin: 'full',
  admin: 'full',
  registrations_officer: 'full',
  innovator_lead: 'full',
  exhibitor_lead: 'full',
  abstract_lead: 'full',
  rapporteur_lead: 'full',
  wai_health_lead: 'full',
  viewer: 'full',
};

const SECTIONS: { section: string; rows: Row[] }[] = [
  {
    section: 'Overview',
    rows: [{ area: 'Dashboard', access: FULL_ALL }],
  },
  {
    section: 'Event Setup',
    rows: [
      {
        area: 'Registrations (row-scoped to own type for Innovator/Exhibitor Lead; excludes Exhibitor/Innovator for Registrations Officer)',
        access: { super_admin: 'full', admin: 'full', registrations_officer: 'full', innovator_lead: 'full', exhibitor_lead: 'full', viewer: 'view' },
      },
      { area: 'Access Codes', access: { super_admin: 'full', admin: 'full' } },
      { area: 'Sponsorship Applications', access: { super_admin: 'full', admin: 'full', registrations_officer: 'full' } },
      { area: 'Payments', access: { super_admin: 'full', admin: 'full', viewer: 'view' } },
      { area: 'Reconciliations / Portal Tokens', access: { super_admin: 'full', admin: 'full' } },
      { area: 'Check-In', access: { super_admin: 'full', admin: 'full', registrations_officer: 'full' } },
      {
        area: 'Women in AI & Health Breakfast (capacity/eligibility notices are wai_health_lead-only; Registrations Officer is view-only)',
        access: { super_admin: 'full', admin: 'full', wai_health_lead: 'full', registrations_officer: 'view' },
      },
    ],
  },
  {
    section: 'People',
    rows: [
      { area: 'Attendees / Volunteers / Team', access: { super_admin: 'full', admin: 'full', registrations_officer: 'full', viewer: 'view' } },
      { area: 'Exhibitors (stats, analytics, leads)', access: { super_admin: 'full', admin: 'full', registrations_officer: 'full', exhibitor_lead: 'full', viewer: 'view' } },
      { area: 'Innovators', access: { super_admin: 'full', admin: 'full', registrations_officer: 'full', innovator_lead: 'full', viewer: 'view' } },
      { area: 'Sponsors & Partners', access: { super_admin: 'full', admin: 'full' } },
    ],
  },
  {
    section: 'Content',
    rows: [
      { area: 'Agenda / Speakers / Innovation Showcase / Gallery / Policy Tracker / Translations / Knowledge Products', access: { super_admin: 'full', admin: 'full' } },
      { area: 'Abstracts / Confirmed Abstracts / Rubric / Reviewers', access: { super_admin: 'full', admin: 'full', abstract_lead: 'full' } },
      { area: 'Rapporteurs / Live Transcript', access: { super_admin: 'full', admin: 'full', rapporteur_lead: 'full' } },
    ],
  },
  {
    section: 'Communication',
    rows: [{ area: 'Inquiries / Messages / Newsletter', access: { super_admin: 'full', admin: 'full' } }],
  },
  {
    section: 'Insights',
    rows: [{ area: 'Analytics', access: FULL_ALL }],
  },
  {
    section: 'Administration',
    rows: [
      { area: 'Event Team / Integrations / Users', access: { super_admin: 'full' } },
      { area: 'Audit Log', access: { super_admin: 'full', admin: 'full', viewer: 'view' } },
      { area: 'Roles & Permissions (this page)', access: { super_admin: 'full' } },
      { area: 'Security Command Center', access: {} }, // gated on isRootAdmin identity flag, not a role — see User.model.ts
    ],
  },
];

const AccessMark = ({ level }: { level?: 'full' | 'view' | 'none' }) => {
  if (level === 'full') return <Check size={15} className="mx-auto text-success" />;
  if (level === 'view') return <span className="mx-auto block text-center text-[10px] font-semibold uppercase text-info">View</span>;
  return <Minus size={13} className="mx-auto text-slate-300" />;
};

export const RolesPermissionsPage = () => (
  <div className="mx-auto max-w-6xl">
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy">Roles &amp; Permissions</h1>
      <p className="text-sm text-slate-500">
        A reference for what each of the 9 fixed admin roles can access. Roles are assigned per-account from Users — this page is read-only. The
        Security Command Center is gated separately on the one originally-seeded account, not by role.
      </p>
    </div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {ROLES.map((r) => (
        <div key={r.key} className="rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-secondary text-orange">
            <ShieldCheck size={16} />
          </span>
          <p className="mt-3 text-sm font-semibold text-navy">{r.label}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.blurb}</p>
        </div>
      ))}
    </div>

    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-100 bg-offwhite/60 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Area</th>
              {ROLES.map((r) => (
                <th key={r.key} className="px-3 py-3 text-center font-semibold">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SECTIONS.map((s) => (
              <Fragment key={s.section}>
                <tr className="bg-offwhite/40">
                  <td colSpan={ROLES.length + 1} className="px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                    {s.section}
                  </td>
                </tr>
                {s.rows.map((row) => (
                  <tr key={row.area}>
                    <td className="px-4 py-3 text-navy">{row.area}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="px-3 py-3">
                        <AccessMark level={row.access[r.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
