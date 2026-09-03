import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { useAuth } from '../../contexts/AuthContext';

// Persistent admin shell — sidebar + topbar around every /admin/* page below the
// login/forgot/reset flows, per the Stitch spec's "design the shell once" note.
export const AdminLayout = () => {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <div
      className="min-h-screen bg-offwhite"
      style={{ backgroundImage: 'radial-gradient(ellipse 1200px 500px at 50% -10%, rgba(232,121,44,0.05), transparent)' }}
    >
      <AdminSidebar
        role={user.role}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={`flex min-h-screen flex-col transition-all duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <AdminTopbar onOpenMobileSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
