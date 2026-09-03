import { Fragment } from 'react';
import { Check, Minus, ShieldCheck } from 'lucide-react';

type Role = 'super_admin' | 'content_editor' | 'registrations_officer' | 'viewer';

const ROLES: { key: Role; label: string; blurb: string }[] = [
  { key: 'super_admin', label: 'Super Admin', blurb: 'Full access — the only role that manages users and integrations.' },
  { key: 'content_editor', label: 'Content Editor', blurb: 'Owns public-facing content: speakers, agenda, showcase, partners.' },
  { key: 'registrations_officer', label: 'Registrations Officer', blurb: 'Owns the registration & payment pipeline and event-day check-in.' },
  { key: 'viewer', label: 'Viewer', blurb: 'Read-only — dashboards, registrations, and the audit log.' },
];

interface Row {
  area: string;
  access: Record<Role, 'full' | 'view' | 'none'>;
}

const SECTIONS: { section: string; rows: Row[] }[] = [
  {
    section: 'Overview',
    rows: [{ area: 'Dashboard', access: { super_admin: 'full', content_editor: 'full', registrations_officer: 'full', viewer: 'full' } }],
  },
  {
    section: 'Event Setup',
    rows: [
      { area: 'Registrations', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'view' } },
      { area: 'Access Codes', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'none' } },
      { area: 'Payments', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'view' } },
      { area: 'Reconciliations', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'none' } },
      { area: 'Check-In', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'none' } },
    ],
  },
  {
    section: 'Content',
    rows: [
      { area: 'Agenda / Speakers / Showcase / Abstracts', access: { super_admin: 'full', content_editor: 'full', registrations_officer: 'none', viewer: 'none' } },
    ],
  },
  {
    section: 'People',
    rows: [
      { area: 'Attendees / Exhibitors / Volunteers', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'view' } },
      { area: 'Sponsors & Partners', access: { super_admin: 'full', content_editor: 'full', registrations_officer: 'none', viewer: 'none' } },
      { area: 'Portal Tokens', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'full', viewer: 'none' } },
    ],
  },
  {
    section: 'Communication',
    rows: [{ area: 'Inquiries & Messages', access: { super_admin: 'full', content_editor: 'full', registrations_officer: 'none', viewer: 'none' } }],
  },
  {
    section: 'Insights',
    rows: [{ area: 'Analytics', access: { super_admin: 'full', content_editor: 'full', registrations_officer: 'full', viewer: 'full' } }],
  },
  {
    section: 'Administration',
    rows: [
      { area: 'Event Team', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'none', viewer: 'none' } },
      { area: 'Integrations', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'none', viewer: 'none' } },
      { area: 'Audit Log', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'none', viewer: 'view' } },
      { area: 'Users', access: { super_admin: 'full', content_editor: 'none', registrations_officer: 'none', viewer: 'none' } },
    ],
  },
];

const AccessMark = ({ level }: { level: 'full' | 'view' | 'none' }) => {
  if (level === 'full') return <Check size={15} className="mx-auto text-success" />;
  if (level === 'view') return <span className="mx-auto block text-center text-[10px] font-semibold uppercase text-info">View</span>;
  return <Minus size={13} className="mx-auto text-slate-300" />;
};

export const RolesPermissionsPage = () => (
  <div className="mx-auto max-w-5xl">
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy">Roles &amp; Permissions</h1>
      <p className="text-sm text-slate-500">
        A reference for what each of the four fixed admin roles can access. Roles are assigned per-account from Users — this page is read-only.
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
