import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { Avatar } from '../ui/Avatar';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  content_editor: 'Content Editor',
  registrations_officer: 'Registrations Officer',
  viewer: 'Viewer',
};

interface AdminTopbarProps {
  onOpenMobileSidebar: () => void;
}

export const AdminTopbar = ({ onOpenMobileSidebar }: AdminTopbarProps) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 justify-between">
      <button onClick={onOpenMobileSidebar} className="text-slate-500 lg:hidden" aria-label="Open menu">
        <Menu size={20} />
      </button>

      <GlobalSearch />

      <div className="flex-1 sm:hidden flex items-center justify-between" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-offwhite"
          >
            <Avatar name={user?.fullName} avatarUrl={user?.avatarUrl} size={36} className="shadow-sm" />
            <span className="hidden text-left sm:block">
              <span className="block text-[13px] font-semibold leading-tight text-navy">{user?.fullName}</span>
              <span className="block text-[11px] leading-tight text-slate-400">
                {user ? ROLE_LABELS[user.role] ?? user.role : ''}
              </span>
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1.5 shadow-card-hover">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
                  <Avatar name={user?.fullName} avatarUrl={user?.avatarUrl} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-navy">{user?.fullName}</p>
                    <p className="truncate text-[11px] text-slate-400">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/admin/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-offwhite hover:text-navy"
                >
                  <UserCircle size={15} /> Edit Profile
                </Link>
                <button
                  onClick={() => logout()}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-offwhite hover:text-navy"
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
