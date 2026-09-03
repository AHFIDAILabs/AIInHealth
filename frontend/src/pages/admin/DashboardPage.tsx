import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart } from 'recharts';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  CalendarDays,
  Handshake,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  Building2,
  Gift,
  MessageSquare,
  KeyRound,
  Lightbulb,
  HeartHandshake,
  Wallet,
  ScanLine,
  Mail,
  FileText,
  Wallet2,
  AlertCircle,
  Eye,
  ScrollText,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { fetchDashboardStats, exportRegistrationsUrl, type DashboardStats } from '../../services/admin.service';
import { fetchAnalyticsOverview, type AnalyticsOverview } from '../../services/analytics.service';
import { getApiErrorMessage } from '../../services/api';
import { Skeleton } from '../../components/ui/Skeleton';
import { Banner } from '../../components/ui/Banner';

const CARD_CLASS = 'rounded-2xl border border-slate-100 bg-white shadow-card transition-shadow hover:shadow-card-hover';

const naira = (n: number) => `₦${n.toLocaleString('en-NG')}`;

// Full-bleed wavy trend line filling the bottom of a KPI card — a pure stroke
// (no axes/grid/tooltip/fill), smoothed with a natural spline so a handful of
// daily points reads as one continuous wave rather than sharp zigzag peaks.
const Sparkline = ({ data, color }: { data: { v: number }[]; color: string }) => {
  if (data.length < 2) return <div className="-mx-6 -mb-6 mt-4 h-16" />;
  return (
    <div className="-mx-6 -mb-6 mt-4 h-16 w-[calc(100%+3rem)]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 6 }}>
          <Line type="natural" dataKey="v" stroke={color} strokeWidth={2.5} strokeLinecap="round" dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Real, computed vs. the prior 7-day window — never fabricated. Returns null when
// there's no prior window to compare against (e.g. brand-new event data).
const weekOverWeekDelta = (byDay: { date: string; count: number }[] | { date: string; amountNaira: number }[], key: 'count' | 'amountNaira'): number | null => {
  if (byDay.length < 8) return null;
  const values = byDay.map((d) => (d as Record<string, number | string>)[key] as number);
  const last7 = values.slice(-7).reduce((a, b) => a + b, 0);
  const prior7 = values.slice(-14, -7).reduce((a, b) => a + b, 0);
  if (prior7 === 0) return null;
  return Math.round(((last7 - prior7) / prior7) * 100);
};

const DeltaLine = ({ pct }: { pct: number | null }) => {
  if (pct === null) return <p className="mt-1.5 text-[11px] text-slate-400">&nbsp;</p>;
  const isUp = pct >= 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${isUp ? 'text-success' : 'text-danger'}`}>
      <Icon size={12} /> {Math.abs(pct)}% from last week
    </p>
  );
};

// Static per-key class strings, not string-interpolated — Tailwind's JIT scanner
// needs literal class names at build time.
const CHIP_COLOR = {
  orange: { bg: 'bg-orange/15', text: 'text-orange' },
  violet: { bg: 'bg-chart-violet/15', text: 'text-chart-violet' },
  teal: { bg: 'bg-chart-teal/15', text: 'text-chart-teal' },
  rose: { bg: 'bg-chart-rose/15', text: 'text-chart-rose' },
  blue: { bg: 'bg-chart-blue/15', text: 'text-chart-blue' },
  amber: { bg: 'bg-chart-amber/15', text: 'text-chart-amber' },
} as const;
type Chip = keyof typeof CHIP_COLOR;
const CHART_HEX: Record<Chip, string> = { orange: '#E8792C', violet: '#7C3AED', teal: '#0D9488', rose: '#E11D48', blue: '#2563EB', amber: '#D97706' };

const QuickAction = ({ to, href, icon: Icon, color, label }: { to?: string; href?: string; icon: typeof ClipboardList; color: Chip; label: string }) => {
  const content = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${CHIP_COLOR[color].bg} ${CHIP_COLOR[color].text}`}>
        <Icon size={18} />
      </span>
      <span className="text-[13px] font-medium text-navy">{label}</span>
    </>
  );
  const className = 'flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 transition-all hover:border-orange/40 hover:shadow-card';
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} className={className}>
      {content}
    </a>
  );
};

// "Needs attention" tile — a real count that links straight to the filtered list
// where it's actioned, so a role's dashboard doubles as their to-do list, not just
// a report.
const AttentionTile = ({ to, icon: Icon, color, count, label }: { to: string; icon: typeof ClipboardList; color: Chip; count: number; label: string }) => (
  <Link to={to} className={`group flex items-center gap-3.5 p-4 ${CARD_CLASS}`}>
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${CHIP_COLOR[color].bg} ${CHIP_COLOR[color].text}`}>
      <Icon size={19} />
    </span>
    <div className="min-w-0">
      <p className="font-display text-2xl font-extrabold leading-none tabular-nums text-navy">{count}</p>
      <p className="mt-1 truncate text-[12px] text-slate-500">{label}</p>
    </div>
  </Link>
);

// One row of a content-publishing checklist — published/total with a mini progress bar.
const ContentRow = ({ icon: Icon, color, label, published, total, to }: { icon: typeof Users; color: Chip; label: string; published: number; total: number; to: string }) => {
  const pct = total ? Math.round((published / total) * 100) : 0;
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-offwhite">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CHIP_COLOR[color].bg} ${CHIP_COLOR[color].text}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-navy">{label}</span>
          <span className="tabular-nums text-slate-400">
            {published}/{total}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-offwhite">
          <div className={`h-full rounded-full ${CHIP_COLOR[color].text.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
};

const ACTIVITY_META: Record<string, { icon: typeof UserPlus; color: Chip }> = {
  'registration.new': { icon: UserPlus, color: 'blue' },
  'inquiry.new': { icon: Handshake, color: 'violet' },
  'message.new': { icon: MessageSquare, color: 'teal' },
};

const timeAgo = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const STATUS_META: Record<string, { label: string; hex: string; icon: typeof Clock }> = {
  pending: { label: 'Pending Review', hex: '#D97706', icon: Clock },
  reviewed: { label: 'Reviewed', hex: '#2563EB', icon: ClipboardList },
  confirmed: { label: 'Confirmed', hex: '#16A34A', icon: CheckCircle2 },
  declined: { label: 'Declined', hex: '#DC2626', icon: XCircle },
};

const TYPE_META: Record<string, { label: string; icon: typeof UserPlus; hex: string }> = {
  attendee: { label: 'Attendee', icon: UserPlus, hex: CHART_HEX.orange },
  exhibitor: { label: 'Exhibitor', icon: Building2, hex: CHART_HEX.violet },
  sponsor: { label: 'Sponsor', icon: Gift, hex: CHART_HEX.teal },
  volunteer: { label: 'Volunteer', icon: HeartHandshake, hex: CHART_HEX.rose },
};

const RECENT_ACTIVITY_FILTER: Record<string, string[] | null> = {
  super_admin: null, // sees everything
  registrations_officer: ['registration.new'],
  viewer: ['registration.new'],
  content_editor: ['inquiry.new', 'message.new'],
};

export const DashboardPage = () => {
  const { user } = useAuth();
  const { notifications, connected } = useNotifications();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState('');

  const role = user?.role;
  const showRegistrations = role === 'super_admin' || role === 'registrations_officer' || role === 'viewer';
  const showContent = role === 'super_admin' || role === 'content_editor';
  const isViewer = role === 'viewer';

  useEffect(() => {
    fetchDashboardStats()
      .then(setStats)
      .catch((err) => setError(getApiErrorMessage(err)));
    if (showRegistrations) {
      fetchAnalyticsOverview()
        .then(setAnalytics)
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const totalRevenueNaira = analytics ? analytics.revenueByDay.reduce((sum, d) => sum + d.amountNaira, 0) : 0;
  const registrationsDelta = analytics ? weekOverWeekDelta(analytics.registrationsByDay, 'count') : null;
  const revenueDelta = analytics ? weekOverWeekDelta(analytics.revenueByDay, 'amountNaira') : null;
  const confirmedCount = stats?.registrations.byStatus.confirmed ?? 0;
  const confirmedRate = stats?.registrations.total ? Math.round((confirmedCount / stats.registrations.total) * 100) : 0;

  const visibleActivity = notifications.filter((n) => {
    const filter = role ? RECENT_ACTIVITY_FILTER[role] : null;
    return !filter || filter.includes(n.type);
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-navy sm:text-[30px]">
          Welcome back, {user?.fullName?.split(' ')[0]}
        </h1>
      </div>

      {error && (
        <div className="mt-6">
          <Banner variant="error">{error}</Banner>
        </div>
      )}

      {/* Needs Attention — a real to-do list, scoped to what this role can act on */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(role === 'super_admin' || role === 'registrations_officer') && (
          <>
            <AttentionTile to="/admin/registrations?status=pending" icon={Clock} color="amber" count={stats?.registrationsQueue.pendingReview ?? 0} label="Registrations pending review" />
            <AttentionTile to="/admin/payments" icon={Wallet2} color="rose" count={stats?.registrationsQueue.unpaid ?? 0} label="Unpaid attendee registrations" />
          </>
        )}
        {(role === 'super_admin' || role === 'content_editor') && (
          <>
            <AttentionTile to="/admin/abstracts?status=pending" icon={FileText} color="violet" count={stats?.content.abstracts.pending ?? 0} label="Abstracts awaiting review" />
            <AttentionTile to="/admin/inquiries" icon={Mail} color="teal" count={stats?.communication.pendingInquiries ?? 0} label="New partnership inquiries" />
          </>
        )}
        {role === 'content_editor' && (
          <AttentionTile to="/admin/messages" icon={MessageSquare} color="blue" count={stats?.communication.unreadMessages ?? 0} label="Unread contact messages" />
        )}
        {isViewer && (
          <>
            <AttentionTile to="/admin/registrations?status=pending" icon={Clock} color="amber" count={stats?.registrationsQueue.pendingReview ?? 0} label="Registrations pending review" />
            <AttentionTile to="/admin/analytics" icon={BarChart3} color="blue" count={stats?.registrations.total ?? 0} label="Total registrations to date" />
          </>
        )}
      </div>

      {/* Registration KPIs — super_admin, registrations_officer, viewer */}
      {showRegistrations && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className={`overflow-hidden p-6 ${CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange/15 text-orange">
                  <ClipboardList size={24} />
                </span>
                <p className="text-[13px] font-medium text-slate-500">Total Registrations</p>
              </div>
              {stats ? (
                <p className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{stats.registrations.total}</p>
              ) : (
                <Skeleton className="mt-4 h-9 w-16" />
              )}
              <DeltaLine pct={registrationsDelta} />
              <Sparkline data={(analytics?.registrationsByDay ?? []).slice(-14).map((d) => ({ v: d.count }))} color={CHART_HEX.orange} />
            </div>

            <div className={`overflow-hidden p-6 ${CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-chart-teal/15 text-chart-teal">
                  <Wallet size={24} />
                </span>
                <p className="text-[13px] font-medium text-slate-500">Revenue Collected</p>
              </div>
              {analytics ? (
                <p className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{naira(totalRevenueNaira)}</p>
              ) : (
                <Skeleton className="mt-4 h-9 w-24" />
              )}
              <DeltaLine pct={revenueDelta} />
              <Sparkline data={(analytics?.revenueByDay ?? []).slice(-14).map((d) => ({ v: d.amountNaira }))} color={CHART_HEX.teal} />
            </div>

            <div className={`overflow-hidden p-6 ${CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-chart-blue/15 text-chart-blue">
                  <CheckCircle2 size={24} />
                </span>
                <p className="text-[13px] font-medium text-slate-500">Confirmed</p>
              </div>
              {stats ? (
                <p className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{confirmedCount}</p>
              ) : (
                <Skeleton className="mt-4 h-9 w-16" />
              )}
              <div className="mt-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-offwhite">
                  <div className="h-full rounded-full bg-chart-blue transition-all" style={{ width: `${confirmedRate}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">{confirmedRate}% of total registrations</p>
              </div>
            </div>

            <div className={`overflow-hidden p-6 ${CARD_CLASS}`}>
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-chart-rose/15 text-chart-rose">
                  <ScanLine size={24} />
                </span>
                <p className="text-[13px] font-medium text-slate-500">Checked In</p>
              </div>
              {analytics ? (
                <p className="mt-4 font-display text-[32px] font-extrabold leading-none tracking-tight text-navy tabular-nums">{analytics.checkedInCount}</p>
              ) : (
                <Skeleton className="mt-4 h-9 w-16" />
              )}
              <div className="mt-5">
                <div className="h-2 w-full overflow-hidden rounded-full bg-offwhite">
                  <div className="h-full rounded-full bg-chart-rose transition-all" style={{ width: `${analytics?.checkInRate ?? 0}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">{analytics?.checkInRate ?? 0}% of confirmed delegates</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className={`p-6 ${CARD_CLASS}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registration Status Breakdown</p>
              {!stats ? (
                <Skeleton className="mt-4 h-52 w-full" />
              ) : stats.registrations.total === 0 ? (
                <p className="mt-8 py-8 text-center text-sm text-slate-400">No registrations yet</p>
              ) : (
                <div className="mt-3 flex items-center gap-4">
                  <div className="relative h-56 w-1/2 min-w-0 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.registrations.byStatus).map(([status, count]) => ({
                            name: STATUS_META[status]?.label ?? status,
                            value: count,
                            hex: STATUS_META[status]?.hex ?? '#94A3B8',
                          }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="72%"
                          outerRadius="100%"
                          paddingAngle={4}
                          cornerRadius={6}
                          stroke="none"
                        >
                          {Object.entries(stats.registrations.byStatus).map(([status]) => (
                            <Cell key={status} fill={STATUS_META[status]?.hex ?? '#94A3B8'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="font-display text-[28px] font-extrabold tabular-nums text-navy">{stats.registrations.total}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3.5">
                    {Object.entries(stats.registrations.byStatus).map(([status, count]) => {
                      const meta = STATUS_META[status];
                      const pct = stats.registrations.total ? Math.round((count / stats.registrations.total) * 100) : 0;
                      return (
                        <div key={status} className="flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-2.5 font-medium text-navy">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: meta?.hex ?? '#94A3B8' }} />
                            {meta?.label ?? status}
                          </span>
                          <span className="tabular-nums text-slate-400">
                            <span className="font-semibold text-navy">{count}</span> ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className={`p-6 ${CARD_CLASS}`}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registrations by Type</p>
              {!stats ? (
                <Skeleton className="mt-4 h-52 w-full" />
              ) : stats.registrations.total === 0 ? (
                <p className="mt-8 py-8 text-center text-sm text-slate-400">No registrations yet</p>
              ) : (
                <div className="mt-3 h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(stats.registrations.byType).map(([type, count]) => ({ name: TYPE_META[type]?.label ?? type, count, hex: TYPE_META[type]?.hex ?? '#94A3B8' }))}
                      margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip cursor={{ fill: '#F8F9FA' }} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 12 }} />
                      <Bar dataKey="count" radius={[10, 10, 0, 0]} maxBarSize={56}>
                        {Object.entries(stats.registrations.byType).map(([type]) => (
                          <Cell key={type} fill={TYPE_META[type]?.hex ?? '#94A3B8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Content publishing — super_admin, content_editor */}
      {showContent && (
        <div className={`mt-5 p-6 ${CARD_CLASS}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Content Publishing</p>
          <div className="mt-2 divide-y divide-slate-50">
            {stats ? (
              <>
                <ContentRow icon={Users} color="violet" label="Speakers" published={stats.content.speakers.published} total={stats.content.speakers.total} to="/admin/speakers" />
                <ContentRow icon={CalendarDays} color="teal" label="Agenda Sessions" published={stats.content.sessions.published} total={stats.content.sessions.total} to="/admin/sessions" />
                <ContentRow icon={Lightbulb} color="rose" label="Innovation Showcase" published={stats.content.innovations.published} total={stats.content.innovations.total} to="/admin/innovations" />
                <ContentRow icon={Handshake} color="amber" label="Partners" published={stats.content.partners.published} total={stats.content.partners.total} to="/admin/partners" />
              </>
            ) : (
              <div className="space-y-3 py-1">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* Recent activity — live via Socket.IO, filtered to what this role owns */}
        <div className={`p-6 ${CARD_CLASS}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Activity</p>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-success' : 'bg-slate-300'}`} />
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
          <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
            {visibleActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Nothing yet — new submissions will show up here live.</p>
            ) : (
              visibleActivity.slice(0, 10).map((item) => {
                const meta = ACTIVITY_META[item.type] ?? { icon: ClipboardList, color: 'orange' as const };
                return (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-offwhite">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${CHIP_COLOR[meta.color].bg} ${CHIP_COLOR[meta.color].text}`}>
                      <meta.icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-navy">{item.title}</p>
                      <p className="truncate text-[11px] text-slate-400">{item.body ?? timeAgo(item.createdAt)}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-300">{timeAgo(item.createdAt)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick actions — strictly scoped to what this role can actually do */}
        <div className={`p-6 ${CARD_CLASS}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{isViewer ? 'Quick Links' : 'Quick Actions'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {role === 'super_admin' && (
              <>
                <QuickAction to="/admin/registrations" icon={ClipboardList} color="orange" label="Review Registrations" />
                <QuickAction href={exportRegistrationsUrl({})} icon={Download} color="blue" label="Export Data" />
                <QuickAction to="/admin/speakers" icon={Users} color="violet" label="Add Speaker" />
                <QuickAction to="/admin/sessions" icon={CalendarDays} color="teal" label="Add Session" />
                <QuickAction to="/admin/access-codes" icon={KeyRound} color="amber" label="Generate Access Codes" />
                <QuickAction to="/admin/innovations" icon={Lightbulb} color="rose" label="Add Innovation" />
              </>
            )}
            {role === 'registrations_officer' && (
              <>
                <QuickAction to="/admin/registrations" icon={ClipboardList} color="orange" label="Review Registrations" />
                <QuickAction to="/admin/check-in" icon={ScanLine} color="rose" label="Check-In Delegates" />
                <QuickAction to="/admin/access-codes" icon={KeyRound} color="amber" label="Generate Access Codes" />
                <QuickAction href={exportRegistrationsUrl({})} icon={Download} color="blue" label="Export Data" />
              </>
            )}
            {role === 'content_editor' && (
              <>
                <QuickAction to="/admin/speakers" icon={Users} color="violet" label="Add Speaker" />
                <QuickAction to="/admin/sessions" icon={CalendarDays} color="teal" label="Add Session" />
                <QuickAction to="/admin/innovations" icon={Lightbulb} color="rose" label="Add Innovation" />
                <QuickAction to="/admin/partners" icon={Handshake} color="amber" label="Add Partner" />
                <QuickAction to="/admin/abstracts" icon={FileText} color="orange" label="Review Abstracts" />
                <QuickAction to="/admin/access-codes" icon={KeyRound} color="amber" label="Invite Volunteers" />
                <QuickAction to="/admin/messages" icon={MessageSquare} color="blue" label="Contact Messages" />
              </>
            )}
            {isViewer && (
              <>
                <QuickAction to="/admin/registrations" icon={Eye} color="orange" label="View Registrations" />
                <QuickAction to="/admin/analytics" icon={BarChart3} color="blue" label="View Analytics" />
                <QuickAction to="/admin/audit-log" icon={ScrollText} color="violet" label="View Audit Log" />
                <QuickAction href={exportRegistrationsUrl({})} icon={Download} color="teal" label="Export Data" />
              </>
            )}
          </div>

          {role === 'super_admin' && stats && (
            <>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Team</p>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-offwhite px-3.5 py-3 text-[13px]">
                <AlertCircle size={15} className="text-orange" />
                <span className="text-navy">{stats.team.activeMembers} active event team member{stats.team.activeMembers === 1 ? '' : 's'} rostered</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
