import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailCheck } from 'lucide-react';
import { AdminAuthLayout } from '../../components/layout/AdminAuthLayout';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import * as authService from '../../services/auth.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

export const ForgotPasswordPage = () => {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authService.forgotPassword(values.email);
      setSubmittedEmail(values.email);
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err));
    }
  };

  if (submittedEmail) {
    return (
      <AdminAuthLayout title="Check your email">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck size={28} />
          </div>
          <p className="mt-4 text-sm text-slate-300">
            If <span className="font-semibold text-white">{submittedEmail}</span> is registered, we&rsquo;ve sent a
            link to reset your password. It expires in 30 minutes.
          </p>
          <Link to="/admin/login" className="mt-6 text-sm font-semibold text-orange hover:text-orange-hover">
            Back to Sign In
          </Link>
        </div>
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout title="Forgot Password" subtitle="Enter your email and we'll send you a reset link">
      {serverError && (
        <div className="mb-5">
          <Banner variant="error">{serverError}</Banner>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" loading={isSubmitting} className="w-full normal-case">
          Send Reset Link
        </Button>
        <Link to="/admin/login" className="block text-center text-sm font-semibold text-slate-400 hover:text-white">
          Back to Sign In
        </Link>
      </form>
    </AdminAuthLayout>
  );
};
