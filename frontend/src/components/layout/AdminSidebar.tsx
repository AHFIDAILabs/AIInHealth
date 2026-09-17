import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CalendarDays,
  Handshake,
  Mail,
  MessageSquare,
  ScrollText,
  UserCog,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  KeyRound,
  Lightbulb,
  CreditCard,
  Scale,
  ScanLine,
  FileText,
  UserPlus,
  Building2,
  HeartHandshake,
  Smartphone,
  BarChart3,
  UsersRound,
  Plug,
  ShieldCheck,
  Images,
} from 'lucide-react';
import type { Role } from '../../services/auth.service';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';
import summitMark from '../../assets/images/summit_logo_mark.png';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  registrations_officer: 'Registrations Officer',
  viewer: 'Viewer',
};

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  soon?: boolean; // shows a "Soon" badge next to the label — not yet a real feature
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const contentRoles: Role[] = ['super_admin', 'content_editor'];
const registrationRoles: Role[] = ['super_admin', 'registrations_officer'];
const allRoles: Role[] = ['super_admin', 'content_editor', 'registrations_officer', 'viewer'];

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard, roles: allRoles }],
  },
  {
    label: 'Event Setup',
    items: [
      { label: 'Registrations', to: '/admin/registrations', icon: ClipboardList, roles: [...registrationRoles, 'viewer'] },
      { label: 'Access Codes', to: '/admin/access-codes', icon: KeyRound, roles: [...registrationRoles, 'content_editor'] },
      { label: 'Payments', to: '/admin/payments', icon: CreditCard, roles: [...registrationRoles, 'viewer'] },
      { label: 'Reconciliations', to: '/admin/reconciliations', icon: Scale, roles: registrationRoles },
      { label: 'Check-In', to: '/admin/check-in', icon: ScanLine, roles: registrationRoles },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Agenda', to: '/admin/sessions', icon: CalendarDays, roles: contentRoles },
      { label: 'Speakers', to: '/admin/speakers', icon: Users, roles: contentRoles },
      { label: 'Innovation Showcase', to: '/admin/innovations', icon: Lightbulb, roles: contentRoles },
      { label: 'Abstracts', to: '/admin/abstracts', icon: FileText, roles: contentRoles },
      { label: 'Gallery', to: '/admin/media', icon: Images, roles: contentRoles },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Attendees', to: '/admin/attendees', icon: UserPlus, roles: [...registrationRoles, 'viewer'] },
      { label: 'Exhibitors', to: '/admin/exhibitors', icon: Building2, roles: [...registrationRoles, 'viewer'] },
      { label: 'Volunteers', to: '/admin/registrations?type=volunteer', icon: HeartHandshake, roles: [...registrationRoles, 'viewer', 'content_editor'] },
      { label: 'Sponsors & Partners', to: '/admin/partners', icon: Handshake, roles: contentRoles },
      { label: 'Portal Tokens', to: '/admin/portal-tokens', icon: Smartphone, roles: registrationRoles },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Partnership Inquiries', to: '/admin/inquiries', icon: Mail, roles: contentRoles },
      { label: 'Messages', to: '/admin/messages', icon: MessageSquare, roles: contentRoles },
    ],
  },
  {
    label: 'Insights',
    items: [{ label: 'Analytics', to: '/admin/analytics', icon: BarChart3, roles: allRoles }],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Event Team', to: '/admin/event-team', icon: UsersRound, roles: ['super_admin'] },
      { label: 'Integrations', to: '/admin/integrations', icon: Plug, roles: ['super_admin'] },
      { label: 'Roles & Permissions', to: '/admin/roles-permissions', icon: ShieldCheck, roles: ['super_admin'] },
      { label: 'Audit Log', to: '/admin/audit-log', icon: ScrollText, roles: ['super_admin', 'viewer'] },
      { label: 'Users', to: '/admin/users', icon: UserCog, roles: ['super_admin'] },
    ],
  },
];

interface AdminSidebarProps {
  role: Role;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

// A plain pathname match isn't enough here — three People items all point to
// /admin/registrations with a different ?type= each, and react-router's NavLink
// only compares pathnames, so all three would show active together. This compares
// the full href (path + query) instead, and treats the bare /admin/registrations
// link as active only when no type filter is present.
const isItemActive = (to: string, pathname: string, search: string): boolean => {
  const [path, query] = to.split('?');
  if (path !== pathname) return false;
  return query ? search === `?${query}` : search === '';
};

export const AdminSidebar = ({ role, collapsed, onToggle, mobileOpen, onCloseMobile }: AdminSidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);

  // Active state is a solid, high-contrast pill — not a translucent tint — so the
  // current section reads at a glance against the dark rail, same weight as the
  // active-state treatment on the reference dashboards.
  const linkClass = (isActive: boolean) =>
    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
      isActive ? 'bg-orange text-white shadow-[0_4px_14px_-2px_rgba(232,121,44,0.45)]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
    }`;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-navy/60 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-800 bg-navy-nav transition-all duration-200 lg:translate-x-0 ${
          collapsed ? 'w-[72px]' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-800/80 px-4">
          <img src={summitMark} alt="" className="h-8 w-8 shrink-0 rounded-lg shadow-[0_2px_8px_-1px_rgba(232,121,44,0.35)]" />
          {!collapsed && (
            <span className="truncate text-[14px] font-semibold text-white">
              AI<span className="text-orange">in</span>Health Admin
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-4">
          {sections.map((section, si) => (
            <div key={section.label} className={si > 0 ? 'mt-5' : ''}>
              {!collapsed ? (
                <p className="px-3 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">{section.label}</p>
              ) : (
                si > 0 && <div className="mx-3 mb-2 border-t border-slate-800/80" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={linkClass(isItemActive(item.to, location.pathname, location.search))}
                  >
                    <item.icon size={17} className="shrink-0" />
                    {!collapsed && (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="truncate">{item.label}</span>
                        {item.soon && (
                          <span className="shrink-0 rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 group-hover:text-slate-400">
                            Soon
                          </span>
                        )}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800/80 p-2.5">
          <NavLink
            to="/admin/settings"
            onClick={onCloseMobile}
            title={collapsed ? 'Settings' : undefined}
            className={({ isActive }) => linkClass(isActive)}
          >
            <Settings size={17} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
          <button
            onClick={onToggle}
            className="mt-1 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white lg:flex"
          >
            {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>

        {!collapsed && user && (
          <div className="border-t border-slate-800/80 p-3">
            <Link
              to="/admin/settings"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2.5 transition-colors hover:bg-white/[0.08]"
            >
              <span className="relative shrink-0">
                <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size={36} className="shadow-[0_2px_8px_-1px_rgba(232,121,44,0.35)]" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-navy-nav bg-success" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-white">{user.fullName}</span>
                <span className="block truncate text-[11px] text-slate-500">{ROLE_LABELS[user.role] ?? user.role}</span>
              </span>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
};
