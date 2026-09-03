import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../services/auth.service';
import { Forbidden } from '../pages/admin/Forbidden';

interface RequireRoleProps {
  roles: Role[];
}

// Sits inside ProtectedRoute + AdminLayout — authentication is already confirmed by
// the time this runs, this only narrows by role, rendering the designed 403 state
// instead of a broken page when a role-mismatched user navigates here directly.
export const RequireRole = ({ roles }: RequireRoleProps) => {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Forbidden />;
  return <Outlet />;
};
