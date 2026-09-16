import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import { verifyMagicLink } from '../../services/reviewer.service';
import { useReviewerAuth } from '../../contexts/ReviewerAuthContext';
import { getApiErrorMessage } from '../../services/api';

export const ReviewerVerify = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { refresh } = useReviewerAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('This sign-in link is missing its token.');
      return;
    }
    verifyMagicLink(token)
      .then(() => refresh())
      .then(() => navigate('/review', { replace: true }))
      .catch((err) => setError(getApiErrorMessage(err, 'This sign-in link is invalid or has expired.')));
  }, [token, refresh, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-offwhite px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
        {error ? (
          <>
            <XCircle size={36} className="mx-auto text-danger" />
            <h1 className="mt-4 font-display text-lg font-semibold text-navy">Sign-in failed</h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
            <Link to="/review/login" className="mt-5 inline-block text-sm font-semibold text-orange hover:text-orange-hover">
              Request a new link
            </Link>
          </>
        ) : (
          <>
            <Loader2 size={32} className="mx-auto animate-spin text-orange" />
            <p className="mt-4 font-display text-lg font-semibold text-navy">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
};
