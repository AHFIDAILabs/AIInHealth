import { Navigate, Outlet } from 'react-router-dom';
import { useDelegateAuth } from '../contexts/DelegateAuthContext';

export const PortalProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useDelegateAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-orange" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/portal/login" replace />;
};
