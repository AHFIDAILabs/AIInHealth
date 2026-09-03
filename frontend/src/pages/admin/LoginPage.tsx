import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AdminAuthLayout } from '../../components/layout/AdminAuthLayout';
import { FormField } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<{ locked: boolean; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      const locked = message.toLowerCase().includes('too many attempts');
      setServerError({ locked, message });
    }
  };

  return (
    <AdminAuthLayout title="Admin Sign In" subtitle="AI in Health Summit 2026 admin portal">
      {serverError && (
        <div className="mb-5">
          <Banner variant={serverError.locked ? 'warning' : 'error'}>{serverError.message}</Banner>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link to="/admin/forgot-password" className="text-sm font-semibold text-orange hover:text-orange-hover">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full normal-case">
          Sign In
        </Button>
      </form>
    </AdminAuthLayout>
  );
};
