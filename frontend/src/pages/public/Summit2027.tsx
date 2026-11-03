import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Send } from 'lucide-react';
import { PageHero } from '../../design-system/patterns';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { LightField } from '../../components/ui/LightField';
import { HoneypotField } from '../../design-system/primitives/HoneypotField';
import {
  submitInterest2027,
  fetchInterest2027Invite,
  INTEREST_2027_TYPES,
  INTEREST_2027_LABELS,
} from '../../services/interest2027.service';
import { getApiErrorMessage } from '../../services/api';
import { useFormToken } from '../../hooks/useFormToken';
import { GENERIC_FORM_INVALID_MESSAGE } from '../../lib/siteInfo';
import { SEO } from '../../components/seo/SEO';
import { trackEvent } from '../../lib/analytics';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().optional(),
  whatsappOptIn: z.boolean(),
  organisation: z.string().trim().optional(),
  role: z.string().trim().optional(),
  country: z.string().trim().min(2, 'Enter your country'),
  interestTypes: z.array(z.enum(INTEREST_2027_TYPES)).min(1, 'Select at least one'),
  consentGiven: z.boolean().refine((v) => v === true, { message: 'Consent is required to join the list' }),
  // Honeypot — mirrors Contact.tsx's formMeta convention.
  formMeta: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

// The real 2027 interest-list domain (brief section 8.3), replacing the
// interim NewsletterCapture placeholder that lived here. Dates/theme stay
// deliberately unconfirmed per section 13 until management decides.
export const Summit2027 = () => {
  const [submitError, setSubmitError] = useState('');
  const formToken = useFormToken();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { whatsappOptIn: false, consentGiven: false, interestTypes: [] },
  });

  // Prefill only ever happens via a personalised link someone was actually
  // sent — the form never guesses at or exposes registration data on its
  // own. A missing/invalid token just leaves the form blank, no error shown.
  useEffect(() => {
    if (!inviteToken) return;
    fetchInterest2027Invite(inviteToken)
      .then((invite) => {
        reset((current) => ({
          ...current,
          fullName: invite.fullName ?? current.fullName,
          email: invite.email ?? current.email,
        }));
      })
      .catch(() => undefined);
  }, [inviteToken, reset]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError('');
    try {
      await submitInterest2027({ ...values, inviteToken, formToken });
      void trackEvent('waitlist_signup', { interestTypes: values.interestTypes.join(','), viaInvite: !!inviteToken });
      reset(undefined, { keepIsSubmitSuccessful: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  const onInvalid = () => setSubmitError(GENERIC_FORM_INVALID_MESSAGE);

  return (
    <>
      <SEO title="AI in Health Summit 2027" description="Dates to be announced — join the list to hear first about the next AI in Health Summit." path="/2027" />
      <PageHero eyebrow="Save the Date" title="AI in Health Summit 2027" subtitle="Dates to be announced." />

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Stay in the Loop</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Tell us how you'd like to be involved</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              We're already planning the next edition. Leave your details and tell us what you're interested in — we'll be in
              touch as soon as dates, themes and registration open.
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-offwhite p-6 sm:p-8">
              {isSubmitSuccessful ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <CheckCircle2 size={28} className="text-orange" />
                  <p className="font-display text-base font-semibold text-navy">You're on the 2027 list — thank you!</p>
                  <p className="text-sm text-slate-500">We'll email you as soon as there's news.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5" noValidate>
                  <HoneypotField {...register('formMeta')} />
                  {submitError && (
                    <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                      {submitError}
                    </p>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <LightField label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
                    <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <LightField label="Phone (optional)" type="tel" {...register('phone')} />
                    <LightField label="Country" error={errors.country?.message} {...register('country')} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <LightField label="Organisation (optional)" {...register('organisation')} />
                    <LightField label="Role (optional)" {...register('role')} />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-navy">How would you like to be involved?</p>
                    {errors.interestTypes && <p className="mb-2 text-xs font-medium text-danger">{errors.interestTypes.message}</p>}
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {INTEREST_2027_TYPES.map((type) => (
                        <label key={type} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                          <input type="checkbox" value={type} className="mt-0.5 h-4 w-4 accent-orange" {...register('interestTypes')} />
                          <span className="text-sm text-navy">{INTEREST_2027_LABELS[type]}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" {...register('whatsappOptIn')} />
                    <span className="text-sm text-navy">You can also reach me on WhatsApp about the 2027 Summit</span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" {...register('consentGiven')} />
                    <span className="text-sm text-navy">
                      I agree to be contacted about the AI in Health Summit 2027, in line with the{' '}
                      <Link to="/privacy" className="font-semibold text-orange underline">
                        privacy policy
                      </Link>
                      .
                    </span>
                  </label>
                  {errors.consentGiven && <p className="text-xs font-medium text-danger">{errors.consentGiven.message}</p>}

                  <Button type="submit" variant="primary" className="w-full sm:w-auto" loading={isSubmitting}>
                    Join the 2027 List <Send size={16} className="ml-1" />
                  </Button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};
