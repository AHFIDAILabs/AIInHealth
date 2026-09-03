import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';
import { AdminAuthLayout } from '../../components/layout/AdminAuthLayout';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
import * as authService from '../../services/auth.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(10, 'Must be at least 10 characters')
      .regex(/[a-z]/, 'Must include a lowercase letter')
      .regex(/[A-Z]/, 'Must include an uppercase letter')
      .regex(/[0-9]/, 'Must include a number')
      .regex(/[^A-Za-z0-9]/, 'Must include a symbol'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const newPassword = watch('newPassword', '');

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => navigate('/admin/login'), 2500);
      return () => clearTimeout(t);
    }
  }, [done, navigate]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await authService.resetPassword(token, values.newPassword, values.confirmPassword);
      setDone(true);
    } catch (err: unknown) {
      setServerError(getApiErrorMessage(err));
    }
  };

  if (!token) {
    return (
      <AdminAuthLayout title="Invalid Link">
        <Banner variant="error">This reset link is missing its token. Request a new one from the sign-in page.</Banner>
        <Link to="/admin/forgot-password" className="mt-6 block text-center text-sm font-semibold text-orange hover:text-orange-hover">
          Request a new link
        </Link>
      </AdminAuthLayout>
    );
  }

  if (done) {
    return (
      <AdminAuthLayout title="Password updated">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 size={28} />
          </div>
          <p className="mt-4 text-sm text-slate-300">Redirecting you to Sign In&hellip;</p>
        </div>
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout title="Reset Password" subtitle="Choose a new password for your admin account">
      {serverError && (
        <div className="mb-5">
          <Banner variant="error">{serverError}</Banner>
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <FormField
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>
        <FormField
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={isSubmitting} className="w-full normal-case">
          Reset Password
        </Button>
      </form>
    </AdminAuthLayout>
  );
};
