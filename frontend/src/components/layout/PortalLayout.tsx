import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Ticket, Users, Handshake, LogOut } from 'lucide-react';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import summitMark from '../../assets/images/summit_logo_mark.png';

const NAV_ITEMS = [
  { label: 'My Ticket', to: '/portal', icon: Ticket, end: true },
  { label: 'Directory', to: '/portal/directory', icon: Users, end: false },
  { label: 'Meetings', to: '/portal/meetings', icon: Handshake, end: false },
];

export const PortalLayout = () => {
  const { delegate, logout } = useDelegateAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src={summitMark} alt="" className="h-7 w-7 rounded-md" />
            <span className="font-display text-[14px] font-semibold text-navy">
              Delegate <span className="text-orange">Portal</span>
            </span>
          </div>
          {delegate && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-danger"
            >
              <LogOut size={15} /> Sign Out
            </button>
          )}
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4 pb-2 sm:px-6">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  isActive ? 'bg-orange/10 text-orange' : 'text-slate-500 hover:bg-offwhite hover:text-navy'
                }`
              }
            >
              <item.icon size={15} /> {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
};
