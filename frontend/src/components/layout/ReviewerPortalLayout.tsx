import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useReviewerAuth } from '../../contexts/ReviewerAuthContext';
import summitMark from '../../assets/images/summit_logo_mark.png';

export const ReviewerPortalLayout = () => {
  const { reviewer, logout } = useReviewerAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/review/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src={summitMark} alt="" className="h-7 w-7 rounded-md" />
            <span className="font-display text-[14px] font-semibold text-navy">
              Reviewer <span className="text-orange">Portal</span>
            </span>
          </div>
          {reviewer && (
            <div className="flex items-center gap-4">
              <span className="hidden text-[13px] text-slate-500 sm:inline">{reviewer.fullName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500 hover:text-danger"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
};
