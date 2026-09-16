import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { requestMagicLink } from '../../services/reviewer.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

export const ReviewerLogin = () => {
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError('');
    try {
      await requestMagicLink(values.email);
      setSent(true);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-offwhite px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
        {sent ? (
          <>
            <CheckCircle2 size={36} className="mx-auto text-success" />
            <h1 className="mt-4 font-display text-lg font-semibold text-navy">Check your email</h1>
            <p className="mt-2 text-sm text-slate-500">
              If that email is registered as a reviewer, we&rsquo;ve sent a sign-in link.
            </p>
          </>
        ) : (
          <>
            <Mail size={32} className="mx-auto text-orange" />
            <h1 className="mt-4 font-display text-lg font-semibold text-navy">Reviewer Portal</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter the email your review assignments were sent to — we&rsquo;ll email you a sign-in link.
            </p>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4 text-left">
              {serverError && <Banner variant="error">{serverError}</Banner>}
              <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
              <Button type="submit" variant="primary" loading={isSubmitting} className="w-full justify-center">
                Send Sign-In Link
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
