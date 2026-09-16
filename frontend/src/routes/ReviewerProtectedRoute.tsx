import { Navigate, Outlet } from 'react-router-dom';
import { useReviewerAuth } from '../contexts/ReviewerAuthContext';

export const ReviewerProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useReviewerAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-offwhite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-orange" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/review/login" replace />;
};
