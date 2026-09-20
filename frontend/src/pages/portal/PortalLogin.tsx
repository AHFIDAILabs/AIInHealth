import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { requestAccessCode, verifyAccessCode } from '../../services/delegate.service';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  code: z.string().trim().min(1, 'Enter your access code'),
});
type FormValues = z.infer<typeof schema>;

// The page every confirmation email links to — it no longer auto-signs
// anyone in from a URL token. The link is just a plain shortcut here; the
// actual credential is the access code emailed alongside it, which the
// delegate types in below. That code is stable (not single-use) and has no
// short countdown — it stays valid for weeks, through a fixed cutoff a week
// after the Summit — so "Resend my code" below always hands back the SAME
// code rather than minting a new one.
export const PortalLogin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useDelegateAuth();
  const [serverError, setServerError] = useState('');
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: params.get('email') ?? '', code: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await verifyAccessCode(values.email, values.code);
      await refresh();
      navigate('/portal', { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'That email/access code combination is invalid.'));
    }
  };

  const resendCode = async () => {
    const email = getValues('email');
    if (!schema.shape.email.safeParse(email).success) {
      setServerError('Enter your email above first, then resend.');
      return;
    }
    setServerError('');
    setResending(true);
    try {
      await requestAccessCode(email);
      setResent(true);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-offwhite px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
        <KeyRound size={32} className="mx-auto text-orange" />
        <h1 className="mt-4 font-display text-lg font-semibold text-navy">Delegate Portal</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Enter the email you registered with, and the access code from your confirmation email.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4 text-left">
          {serverError && <Banner variant="error">{serverError}</Banner>}
          {resent && (
            <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
              <span>
                If that email has a confirmed registration, your access code has been resent — along with your
                e-ticket QR code, if one's ready.
              </span>
            </div>
          )}
          <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <LightField label="Access Code" placeholder="DL-XXXXXX" error={errors.code?.message} {...register('code')} />
          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full justify-center">
            Sign In
          </Button>
          <button
            type="button"
            onClick={resendCode}
            disabled={resending}
            className="w-full text-center text-xs font-semibold text-orange hover:text-orange-hover disabled:opacity-50"
          >
            {resending ? 'Resending…' : "Don't have your code? Resend it"}
          </button>
        </form>
      </div>
    </div>
  );
};
