import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField } from '../../components/ui/LightField';
import { HoneypotField } from '../../components/ui/HoneypotField';
import { RegisterSuccess } from '../../components/register/RegisterSuccess';
import { IdCardUpload } from '../../components/register/IdCardUpload';
import { submitWaiHealthRegistration, linkWaiHealthRegistration, fetchWaiHealthStatus } from '../../services/waiHealth.service';
import { submitRegistration, ID_VERIFICATION_TICKET_CATEGORIES, type TicketCategory } from '../../services/registration.service';
import { initializePayment } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/api';
import { useFormToken } from '../../hooks/useFormToken';
import { SEO } from '../../components/seo/SEO';

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
    jobTitle: z.string().trim().max(200).optional(),
    country: z.string().trim().min(2, 'Enter your country'),
    coHostNetwork: z.string().trim().max(200).optional(),
    confirmsWomen: z.literal(true, {
      errorMap: () => ({ message: 'Please confirm you identify as a woman to register for this session.' }),
    }),
    middleName: z.string().max(0).optional(),
    // Summit opt-in — only required/validated when alsoRegister is checked.
    alsoRegister: z.boolean(),
    ticketCategory: z.enum(TICKET_VALUES).optional(),
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [full, setFull] = useState(false);
  const formToken = useFormToken();

  useEffect(() => {
    fetchWaiHealthStatus()
      .then((s) => setFull(s.full))
      .catch(() => {});
  }, []);

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
        confirmsWomen: values.confirmsWomen,
        middleName: values.middleName,
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
        // Breakfast seat is already confirmed at this point — don't lose that
        // confirmation just because the Summit opt-in failed.
        setServerError(
          `Your Breakfast seat is confirmed. We couldn't complete your Summit registration: ${getApiErrorMessage(err)}. You can register separately any time at /register.`
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

  if (full && !confirmation) {
    return (
      <>
        <PageHero
          eyebrow="Day 1 · 08:00–09:00"
          title="Women in AI & Health Breakfast"
          subtitle="Leading the Future: Women's Voices Shaping AI and Health in Africa"
        />
        <section className="bg-offwhite py-16">
          <Reveal className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
            <Banner variant="info">
              The Breakfast is at capacity. Please contact AHFID directly if you'd like to be added to the waitlist.
            </Banner>
          </Reveal>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Women in AI & Health Breakfast"
        description="Register for the Women in AI & Health Breakfast, the Day 1 opening session of the AI in Health Summit 2026."
        path="/wai-health-breakfast"
      />
      <PageHero
        eyebrow="Day 1 · 08:00–09:00 · Working Breakfast"
        title="Women in AI & Health Breakfast"
        subtitle="Leading the Future: Women's Voices Shaping AI and Health in Africa"
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {confirmation ? (
              <RegisterSuccess message={confirmation} onReset={resetAll} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                <HoneypotField {...register('middleName')} />
                {serverError && <Banner variant="error">{serverError}</Banner>}

                <p className="rounded-xl border border-orange/20 bg-orange/5 px-4 py-3 text-sm text-navy">
                  This session is reserved for women leaders across health, technology, research, and innovation.
                </p>

                <LightField label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                  <LightField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Organization" error={errors.organization?.message} {...register('organization')} />
                  <LightField label="Job Title (optional)" error={errors.jobTitle?.message} {...register('jobTitle')} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Country" error={errors.country?.message} {...register('country')} />
                  <LightField
                    label="Women's Network (optional)"
                    placeholder="If a co-host network invited you"
                    error={errors.coHostNetwork?.message}
                    {...register('coHostNetwork')}
                  />
                </div>

                <div>
                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3.5">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" {...register('confirmsWomen')} />
                    <span className="text-sm text-navy">I confirm I identify as a woman.</span>
                  </label>
                  {errors.confirmsWomen && <p className="mt-1.5 text-xs text-danger">{errors.confirmsWomen.message}</p>}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-offwhite px-4 py-3.5">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange" {...register('alsoRegister')} />
                  <span className="text-sm text-navy">
                    Also register me for the full AI in Health Summit 2026 (19&ndash;20 October). This selects a ticket
                    category and follows the normal registration/payment process.
                  </span>
                </label>

                {alsoRegister && (
                  <div className="space-y-5 rounded-xl border border-slate-200 p-4">
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-navy">Ticket Category</label>
                      <select
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-navy focus:border-orange/40 focus:outline-none"
                        {...register('ticketCategory')}
                      >
                        <option value="">Choose a ticket category…</option>
                        {TICKET_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      {errors.ticketCategory && <p className="mt-1 text-xs text-danger">{errors.ticketCategory.message}</p>}
                    </div>

                    {ticketCategory && ID_VERIFICATION_TICKET_CATEGORIES.includes(ticketCategory) && (
                      <IdCardUpload value={idCardUrl} onChange={(url) => setValue('idCardUrl', url)} error={errors.idCardUrl?.message} />
                    )}

                    <LightField
                      label="Access Code (optional)"
                      placeholder="If you were sent a discount/scholarship code"
                      error={errors.accessCode?.message}
                      {...register('accessCode')}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSubmitting || redirecting}>
                    {redirecting ? 'Redirecting…' : 'Submit Registration'} <Send size={16} className="ml-1" />
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
