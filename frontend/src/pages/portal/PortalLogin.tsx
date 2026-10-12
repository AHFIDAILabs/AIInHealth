import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { delegateLogin } from '../../services/delegate.service';
import { useDelegateAuth } from '../../contexts/DelegateAuthContext';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

// Email-only sign-in — no access code to request/copy/type. Deliberately
// simplified from the old two-step request-code/verify-code flow: that extra
// step was friction that stopped people from bothering to sign in at all,
// which meant they never got as far as generating their "I will be
// attending" share card either.
export const PortalLogin = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useDelegateAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: params.get('email') ?? '' } });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await delegateLogin(values.email);
      await refresh();
      navigate('/portal', { replace: true });
    } catch (err) {
      setServerError(getApiErrorMessage(err, "We couldn't find a confirmed registration for that email."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-offwhite px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
        <KeyRound size={32} className="mx-auto text-orange" />
        <h1 className="mt-4 font-display text-lg font-semibold text-navy">Delegate Portal</h1>
        <p className="mt-1.5 text-sm text-slate-500">Enter the email you registered with to sign in — no code needed.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4 text-left">
          {serverError && <Banner variant="error">{serverError}</Banner>}
          <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full justify-center">
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
};
