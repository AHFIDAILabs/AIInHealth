import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { HoneypotField } from '../../components/ui/HoneypotField';
import { RegisterSuccess } from '../../components/register/RegisterSuccess';
import { IdCardUpload } from '../../components/register/IdCardUpload';
import { submitWaiHealthRegistration, linkWaiHealthRegistration } from '../../services/waiHealth.service';
import { submitRegistration, ID_VERIFICATION_TICKET_CATEGORIES, idVerificationRequirementText, type TicketCategory } from '../../services/registration.service';
import { initializePayment } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/api';
import { useFormToken } from '../../hooks/useFormToken';
import { SEO } from '../../components/seo/SEO';
import { GENERIC_FORM_INVALID_MESSAGE } from '../../lib/siteInfo';

const TICKET_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'international_delegate', label: 'International Delegate' },
  { value: 'nigerian_professional', label: 'Nigerian Professional' },
  { value: 'student_researcher', label: 'Student / Researcher' },
  { value: 'vip', label: 'VIP' },
  { value: 'government_official', label: 'Government Official' },
  { value: 'accredited_media', label: 'Accredited Media' },
];
const TICKET_VALUES = TICKET_OPTIONS.map((t) => t.value) as [TicketCategory, ...TicketCategory[]];

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().min(6, 'Enter a valid phone number'),
    organization: z.string().trim().min(2, 'Enter your organization'),
    jobTitle: z.string().trim().min(2, 'Enter your job title').max(200),
    country: z.string().trim().min(2, 'Enter your country'),
    // Required, but a neutral value like "None" is a perfectly valid answer —
    // this just makes sure the field was actually considered, not skipped.
    coHostNetwork: z.string().trim().min(1, 'Enter a network, or "None" if not applicable').max(200),
    gender: z.enum(['female', 'male'], { errorMap: () => ({ message: 'Select Male or Female.' }) }),
    // Honeypot — see registration.service.ts's comment on why this is named
    // `formMeta`, not something real-sounding that browser autofill could
    // silently poison.
    formMeta: z.string().max(0).optional(),
    // Summit opt-in — only required/validated when alsoRegister is checked.
    alsoRegister: z.boolean(),
    // Accepts '' too (the select's own placeholder option, and what's left
    // over if the Summit opt-in is unticked after a category was chosen —
    // react-hook-form doesn't unregister a hidden field by default) — a bare
    // `.optional()` here only accepts `undefined`, so either case left the
    // actual DOM value '' silently failing validation with no visible error
    // (the error only renders inside the now-hidden opt-in block). Same fix
    // as ScholarshipApplication.tsx's applicantType/level.
    ticketCategory: z.union([z.literal(''), z.enum(TICKET_VALUES)]).optional(),
    accessCode: z.string().trim().max(32).optional().or(z.literal('')),
    idCardUrl: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.alsoRegister) return;
    if (!data.ticketCategory) {
      ctx.addIssue({ code: 'custom', path: ['ticketCategory'], message: 'Choose a ticket category' });
      return;
    }
    if (ID_VERIFICATION_TICKET_CATEGORIES.includes(data.ticketCategory) && !data.idCardUrl) {
      ctx.addIssue({ code: 'custom', path: ['idCardUrl'], message: 'Upload a photo of your official ID to continue.' });
    }
  });
type FormValues = z.infer<typeof schema>;

// A dedicated registration route for the Women in AI & Health Breakfast
// (Day 1 opening session) — deliberately separate from the main Register
// page's attendee flow. The "also register for the Summit" checkbox below
// does NOT grant a free seat: checking it reveals the real ticket-category
// fields and, on submit, makes a second, ordinary call to the same
// submitRegistration() the main Register page uses — identical payment/
// eligibility handling, just triggered from this form too. See
// backend/src/models/WaiHealthRegistration.model.ts for the full rationale.
export const WaiHealthBreakfast = () => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const formToken = useFormToken();

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { alsoRegister: false } });

  const alsoRegister = watch('alsoRegister');
  const ticketCategory = watch('ticketCategory');
  const idCardUrl = watch('idCardUrl');

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const breakfast = await submitWaiHealthRegistration({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        organization: values.organization,
        jobTitle: values.jobTitle,
        country: values.country,
        coHostNetwork: values.coHostNetwork,
        gender: values.gender,
        formMeta: values.formMeta,
        formToken,
      });

      if (!values.alsoRegister || !values.ticketCategory) {
        setConfirmation(breakfast.message);
        return;
      }

      try {
        const accessCode = values.accessCode?.trim();
        const { id, message, requiresPayment } = await submitRegistration({
          type: 'attendee',
          registrationMode: 'individual',
          ticketCategory: values.ticketCategory,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          organization: values.organization,
          jobTitle: values.jobTitle,
          country: values.country,
          accessCode: accessCode ? accessCode.toUpperCase() : undefined,
          idCardUrl: values.idCardUrl,
          formToken,
        });

        // Link BEFORE a possible payment redirect below — once Paystack takes
        // over the page, there's no coming back to make this call.
        await linkWaiHealthRegistration(breakfast.id, id).catch(() => {});

        if (requiresPayment) {
          setRedirecting(true);
          const { authorizationUrl } = await initializePayment(id);
          window.location.href = authorizationUrl;
          return;
        }
        setConfirmation(message);
      } catch (err) {
        // Breakfast signup already went through at this point — don't lose
        // that just because the Summit opt-in failed.
        setServerError(
          t(
            'waiHealth.breakfast.summitOptInFailed',
            "You're on the list for the Breakfast. We couldn't complete your Summit registration: {{error}}. You can register separately any time at /register.",
            { error: getApiErrorMessage(err) }
          )
        );
      }
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const resetAll = () => {
    reset({ alsoRegister: false });
    setConfirmation(null);
  };

  // Safety net for react-hook-form's own silent failure mode: if validation
  // fails on a field that isn't currently rendered (a hidden honeypot an
  // autofill poisoned, or a stale value left over from toggling a
  // conditional section), handleSubmit just never calls onSubmit — no
  // request, no thrown error, no visible change at all. This guarantees SOME
  // visible feedback no matter which field actually failed.
  const onInvalid = () => setServerError(GENERIC_FORM_INVALID_MESSAGE);

  return (
    <>
      <SEO
        title="Women in AI & Health Breakfast"
        description="Register for the Women in AI & Health Breakfast, the Day 1 opening session of the AI in Health Summit 2026."
        path="/wai-health-breakfast"
      />
      <PageHero
        eyebrow={t('waiHealth.breakfast.heroEyebrow', 'Day 1 · 08:00–09:00 · Working Breakfast')}
        title={t('waiHealth.breakfast.heroTitle', 'Women in AI & Health Breakfast')}
        subtitle={t('waiHealth.breakfast.heroSubtitle', "Leading the Future: Women's Voices Shaping AI and Health in Africa")}
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {confirmation ? (
              <RegisterSuccess message={confirmation} onReset={resetAll} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-5">
                <HoneypotField {...register('formMeta')} />
                {serverError && <Banner variant="error">{serverError}</Banner>}

                <p className="rounded-xl border border-orange/20 bg-orange/5 px-4 py-3 text-sm text-navy">
                  {t(
                    'waiHealth.breakfast.intro',
                    'This session is an in-person, closed-door, invite-only, special breakfast session. It is reserved for women leaders across health, technology, research, and innovation.'
                  )}
                </p>

                <LightField label={t('waiHealth.breakfast.form.fullName', 'Full Name')} error={errors.fullName?.message} {...register('fullName')} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label={t('waiHealth.breakfast.form.email', 'Email')} type="email" error={errors.email?.message} {...register('email')} />
                  <LightField label={t('waiHealth.breakfast.form.phone', 'Phone')} type="tel" error={errors.phone?.message} {...register('phone')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField
                    label={t('waiHealth.breakfast.form.organization', 'Organization')}
                    error={errors.organization?.message}
                    {...register('organization')}
                  />
                  <LightField label={t('waiHealth.breakfast.form.jobTitle', 'Job Title')} error={errors.jobTitle?.message} {...register('jobTitle')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label={t('waiHealth.breakfast.form.country', 'Country')} error={errors.country?.message} {...register('country')} />
                  <LightField
                    label={t('waiHealth.breakfast.form.network', "Women's Network")}
                    placeholder={t('waiHealth.breakfast.form.networkPlaceholder', "e.g. a co-host network, or 'None'")}
                    error={errors.coHostNetwork?.message}
                    {...register('coHostNetwork')}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-navy">{t('waiHealth.breakfast.form.gender', 'Gender')}</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5">
                      <input type="radio" value="female" className="h-4 w-4 accent-orange" {...register('gender')} />
                      <span className="text-sm text-navy">{t('waiHealth.breakfast.form.genderFemale', 'Female')}</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5">
                      <input type="radio" value="male" className="h-4 w-4 accent-orange" {...register('gender')} />
                      <span className="text-sm text-navy">{t('waiHealth.breakfast.form.genderMale', 'Male')}</span>
                    </label>
                  </div>
                  {errors.gender && <p className="mt-1.5 text-xs text-danger">{errors.gender.message}</p>}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-offwhite px-4 py-3.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" {...register('alsoRegister')} />
                  <span className="text-sm text-navy">
                    {t(
                      'waiHealth.breakfast.form.alsoRegister',
                      'Also register me for the full AI in Health Summit 2026 (19–20 October). This selects a ticket category and follows the normal registration/payment process.'
                    )}
                  </span>
                </label>

                {alsoRegister && (
                  <div className="space-y-5 rounded-xl border border-slate-200 p-4">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-navy">
                        {t('waiHealth.breakfast.form.ticketCategory', 'Ticket Category')}
                      </label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none"
                        {...register('ticketCategory')}
                      >
                        <option value="">{t('waiHealth.breakfast.form.ticketCategoryPlaceholder', 'Choose a ticket category…')}</option>
                        {TICKET_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {errors.ticketCategory && <p className="mt-1 text-xs text-danger">{errors.ticketCategory.message}</p>}
                    </div>

                    {ticketCategory && ID_VERIFICATION_TICKET_CATEGORIES.includes(ticketCategory) && (
                      <div>
                        <p className="text-sm font-semibold text-navy">{t('waiHealth.breakfast.form.officialId', 'Official ID')}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {idVerificationRequirementText(ticketCategory as 'student_researcher' | 'government_official' | 'accredited_media')}
                        </p>
                        <div className="mt-3">
                          <IdCardUpload value={idCardUrl} onChange={(url) => setValue('idCardUrl', url)} error={errors.idCardUrl?.message} />
                        </div>
                      </div>
                    )}

                    <LightField
                      label={t('waiHealth.breakfast.form.accessCode', 'Access Code (optional)')}
                      placeholder={t('waiHealth.breakfast.form.accessCodePlaceholder', 'If you were sent a discount/scholarship code')}
                      error={errors.accessCode?.message}
                      {...register('accessCode')}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSubmitting || redirecting}>
                    {redirecting ? t('waiHealth.breakfast.form.redirecting', 'Redirecting…') : t('waiHealth.breakfast.form.submit', 'Submit Registration')}{' '}
                    <Send size={16} className="ml-1" />
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
