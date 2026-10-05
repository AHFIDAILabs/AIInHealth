import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { LightField, LightTextArea } from '../ui/LightField';
import { HoneypotField } from '../ui/HoneypotField';
import { RegisterSuccess } from './RegisterSuccess';
import { submitRegistration } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';
import { optionalUrlField } from '../../lib/validation';
import { useFormToken } from '../../hooks/useFormToken';

const schema = z.object({
  companyName: z.string().trim().min(2, 'Enter your startup or project name'),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  contactPhone: z.string().trim().optional(),
  website: optionalUrlField,
  solutionDescription: z.string().trim().max(2000).optional(),
  accessCode: z.string().trim().max(32).optional().or(z.literal('')),
  middleName: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

export const InnovatorForm = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const formToken = useFormToken();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const accessCode = values.accessCode?.trim();
      const { message } = await submitRegistration({
        type: 'innovator',
        ...values,
        accessCode: accessCode ? accessCode.toUpperCase() : undefined,
        formToken,
      });
      setConfirmation(message);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const resetAll = () => {
    reset();
    setConfirmation(null);
  };

  if (confirmation) return <RegisterSuccess message={confirmation} onReset={resetAll} />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <HoneypotField {...register('middleName')} />
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Showcasing an AI-in-health solution? Fill out the form below and our team will follow up with demo table
        options and logistics.
      </p>

      {serverError && <Banner variant="error">{serverError}</Banner>}

      <LightField label="Startup / Project Name" error={errors.companyName?.message} {...register('companyName')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Contact Name" error={errors.contactName?.message} {...register('contactName')} />
        <LightField label="Contact Email" type="email" error={errors.contactEmail?.message} {...register('contactEmail')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Contact Phone" type="tel" error={errors.contactPhone?.message} {...register('contactPhone')} />
        <LightField label="Website" placeholder="https://example.com" error={errors.website?.message} {...register('website')} />
      </div>

      <LightTextArea
        label="What does your solution do?"
        placeholder="Describe the AI-in-health solution you'll be showcasing..."
        error={errors.solutionDescription?.message}
        {...register('solutionDescription')}
      />

      <div>
        <LightField
          label="Access Code (optional)"
          placeholder="e.g. INNO-XXXXXX"
          error={errors.accessCode?.message}
          {...register('accessCode')}
          className="uppercase tracking-wider"
        />
        <p className="mt-1.5 text-xs text-slate-400">
          Already pre-approved by our team? Enter the code you were sent to skip review and confirm immediately.
        </p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Submit Innovator Application
        </Button>
      </div>
    </form>
  );
};
