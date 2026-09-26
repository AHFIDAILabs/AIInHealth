import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { RegisterSuccess } from '../../components/register/RegisterSuccess';
import { submitRegistration } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  jobTitle: z.string().trim().max(200).optional(),
  organization: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

// A deliberately separate registration path from the public "Register Now"
// attendee flow (/register) — event staff shouldn't go through ticket-
// category/payment UI meant for external guests, and shouldn't be counted
// alongside them in attendee analytics (see backend registration.controller.ts's
// 'team' branch and analytics.controller.ts's exclusion of this type). Not
// linked from the main nav — this is a direct link management hands to staff,
// not something the general public should stumble into.
//
// Confirmation is gated against the EventTeamMember roster server-side, not
// self-serve: a match confirms immediately (e-ticket + portal access, same
// as everyone else); no match falls into the normal admin review queue.
export const TeamRegistration = () => {
  const { t } = useTranslation();
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
      const { message } = await submitRegistration({ type: 'team', ...values });
      setConfirmation(message);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const resetAll = () => {
    reset();
    setConfirmation(null);
  };

  return (
    <>
      <PageHero
        eyebrow={t('teamRegistration.eyebrow', 'Event Staff')}
        title={t('teamRegistration.title', 'Team Registration')}
        subtitle={t('teamRegistration.subtitle', 'For AI in Health Summit 2026 staff and event-day team members only.')}
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {confirmation ? (
              <RegisterSuccess message={confirmation} onReset={resetAll} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {serverError && <Banner variant="error">{serverError}</Banner>}
                <p className="rounded-xl border border-slate-200 bg-offwhite px-4 py-3 text-sm text-slate-600">
                  {t(
                    'teamRegistration.form.instructions',
                    'Register with the same email management has on file for you. We’ll confirm your spot and send your e-ticket & check-in QR code.'
                  )}
                </p>

                <LightField label={t('teamRegistration.form.fullName', 'Full Name')} error={errors.fullName?.message} {...register('fullName')} />

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label={t('teamRegistration.form.email', 'Email')} type="email" error={errors.email?.message} {...register('email')} />
                  <LightField label={t('teamRegistration.form.phone', 'Phone')} type="tel" error={errors.phone?.message} {...register('phone')} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField
                    label={t('teamRegistration.form.roleDuty', 'Role / Duty (optional)')}
                    placeholder={t('teamRegistration.form.roleDutyPlaceholder', 'e.g. Registration Desk Lead')}
                    error={errors.jobTitle?.message}
                    {...register('jobTitle')}
                  />
                  <LightField
                    label={t('teamRegistration.form.organization', 'Organization (optional)')}
                    error={errors.organization?.message}
                    {...register('organization')}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSubmitting}>
                    {t('teamRegistration.form.submit', 'Submit Registration')} <Send size={16} className="ml-1" />
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
