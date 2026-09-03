import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { LightField, LightTextArea, LightSelect } from '../ui/LightField';
import { RegisterSuccess } from './RegisterSuccess';
import { submitRegistration } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';
import { optionalUrlField } from '../../lib/validation';

const schema = z.object({
  companyName: z.string().trim().min(2, "Enter your organization's name"),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  contactPhone: z.string().trim().optional(),
  website: optionalUrlField,
  boothSize: z.enum(['small', 'medium', 'large']).optional(),
  productsDescription: z.string().trim().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

export const ExhibitorForm = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const { message } = await submitRegistration({ type: 'exhibitor', ...values });
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
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        Interested in exhibiting? Fill out the form below and our team will follow up with booth options, pricing,
        and logistics.
      </p>

      {serverError && <Banner variant="error">{serverError}</Banner>}

      <LightField label="Company Name" error={errors.companyName?.message} {...register('companyName')} />

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Contact Name" error={errors.contactName?.message} {...register('contactName')} />
        <LightField label="Contact Email" type="email" error={errors.contactEmail?.message} {...register('contactEmail')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Contact Phone" type="tel" error={errors.contactPhone?.message} {...register('contactPhone')} />
        <LightField label="Website" placeholder="https://example.com" error={errors.website?.message} {...register('website')} />
      </div>

      <LightSelect label="Preferred Booth Size" defaultValue="medium" {...register('boothSize')}>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </LightSelect>

      <LightTextArea
        label="Products / Services Description"
        placeholder="Describe your products or services and what you'll be showcasing..."
        error={errors.productsDescription?.message}
        {...register('productsDescription')}
      />

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Submit Exhibitor Application
        </Button>
      </div>
    </form>
  );
};
