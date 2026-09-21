import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Forbidden } from '../pages/admin/Forbidden';

// Same shape as RequireRole, but identity-gated instead of role-gated — see
// backend User.model.ts's isRootAdmin comment for why role alone can't
// express "only the one seeded account." The real enforcement is server-side
// (requireRootAdmin.middleware.ts, checked fresh from the DB on every
// request); this only saves a non-root admin from loading a screen that
// would fail every API call anyway.
export const RequireRootAdmin = () => {
  const { user } = useAuth();
  if (!user || !user.isRootAdmin) return <Forbidden />;
  return <Outlet />;
};
