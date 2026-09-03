import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Users, Globe2, Briefcase, GraduationCap, Crown, Landmark, Newspaper, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { LightField } from '../ui/LightField';
import { RegisterSuccess } from './RegisterSuccess';
import { submitRegistration, type TicketCategory } from '../../services/registration.service';
import { initializePayment } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/api';
import { TICKET_PRICE_NGN, formatNaira } from '../../lib/pricing';

const TICKET_OPTIONS: { value: TicketCategory; label: string; icon: typeof Globe2 }[] = [
  { value: 'international_delegate', label: 'International Delegate', icon: Globe2 },
  { value: 'nigerian_professional', label: 'Nigerian Professional', icon: Briefcase },
  { value: 'student_researcher', label: 'Student / Researcher', icon: GraduationCap },
  { value: 'vip', label: 'VIP', icon: Crown },
  { value: 'government_official', label: 'Government Official', icon: Landmark },
  { value: 'accredited_media', label: 'Accredited Media', icon: Newspaper },
];
const TICKET_VALUES = TICKET_OPTIONS.map((t) => t.value) as [TicketCategory, ...TicketCategory[]];

const groupAttendeeSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter a name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

const schema = z.object({
  registrationMode: z.enum(['individual', 'group']),
  ticketCategory: z.enum(TICKET_VALUES, { errorMap: () => ({ message: 'Choose a ticket category' }) }),
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  organization: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  country: z.string().trim().min(2, 'Enter your country'),
  groupAttendees: z.array(groupAttendeeSchema).optional(),
});
type FormValues = z.infer<typeof schema>;

export const AttendeeForm = () => {
  const [step, setStep] = useState<0 | 1>(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { groupAttendees: [] } });

  const { fields, append, remove } = useFieldArray({ control, name: 'groupAttendees' });
  const mode = watch('registrationMode');
  const ticketCategory = watch('ticketCategory');

  const chooseMode = (value: 'individual' | 'group') => {
    setValue('registrationMode', value);
    setStep(1);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const { id, message, requiresPayment } = await submitRegistration({ type: 'attendee', ...values });
      if (requiresPayment) {
        setRedirecting(true);
        const { authorizationUrl } = await initializePayment(id);
        window.location.href = authorizationUrl;
        return;
      }
      setConfirmation(message);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
      setRedirecting(false);
    }
  };

  const resetAll = () => {
    reset({ groupAttendees: [] });
    setConfirmation(null);
    setStep(0);
  };

  if (confirmation) return <RegisterSuccess message={confirmation} onReset={resetAll} />;

  if (redirecting) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-orange" />
        <p className="font-display text-lg font-semibold text-navy">Redirecting you to secure payment…</p>
        <p className="max-w-sm text-sm text-slate-500">
          You&rsquo;ll complete payment via Paystack, then return here automatically once it&rsquo;s confirmed.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-center gap-2">
        {[0, 1].map((s) => (
          <span key={s} className={`h-1.5 rounded-full transition-all ${step === s ? 'w-8 bg-orange' : 'w-1.5 bg-slate-200'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="mode" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
            <h3 className="text-center font-display text-lg font-semibold text-navy">How would you like to register?</h3>
            <p className="mt-1.5 text-center text-sm text-slate-500">
              Choose individual for yourself, or group to register multiple people from your organization.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => chooseMode('individual')}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-7 text-center transition-all hover:border-orange/50 hover:shadow-glow-subtle"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-secondary text-orange">
                  <User size={22} />
                </span>
                <p className="font-semibold text-navy">Individual Registration</p>
                <p className="text-sm text-slate-500">Register yourself for the Summit</p>
              </button>
              <button
                type="button"
                onClick={() => chooseMode('group')}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-7 text-center transition-all hover:border-orange/50 hover:shadow-glow-subtle"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-secondary text-orange">
                  <Users size={22} />
                </span>
                <p className="font-semibold text-navy">Group Registration</p>
                <p className="text-sm text-slate-500">Register multiple attendees at once</p>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="details"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-7"
          >
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy"
            >
              <ArrowLeft size={15} /> Back
            </button>

            {serverError && <Banner variant="error">{serverError}</Banner>}

            <div>
              <p className="text-sm font-semibold text-navy">Ticket Category</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {TICKET_OPTIONS.map((opt) => {
                  const isActive = ticketCategory === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('ticketCategory', opt.value, { shouldValidate: true })}
                      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                        isActive ? 'border-orange bg-orange/5 shadow-sm shadow-orange/10' : 'border-slate-200 bg-white hover:border-orange/40'
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-orange text-white' : 'bg-navy-secondary text-orange'}`}>
                        <opt.icon size={16} />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-navy">{opt.label}</span>
                        <span className="block text-xs text-slate-500">{formatNaira(TICKET_PRICE_NGN[opt.value])}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.ticketCategory && <p className="mt-2 text-xs font-medium text-danger">{errors.ticketCategory.message}</p>}
            </div>

            <div>
              <p className="text-sm font-semibold text-navy">
                {mode === 'group' ? 'Primary Contact' : 'Your Details'}
              </p>
              <div className="mt-3 grid gap-5 sm:grid-cols-2">
                <LightField label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
                <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                <LightField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
                <LightField label="Country" error={errors.country?.message} {...register('country')} />
                <LightField label="Organization" error={errors.organization?.message} {...register('organization')} />
                <LightField label="Job Title" error={errors.jobTitle?.message} {...register('jobTitle')} />
              </div>
            </div>

            {mode === 'group' && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-navy">Additional Attendees</p>
                  <button
                    type="button"
                    onClick={() => append({ fullName: '', email: '' })}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover"
                  >
                    <Plus size={15} /> Add Attendee
                  </button>
                </div>
                {fields.length === 0 && (
                  <p className="mt-2 text-sm text-slate-500">Add each additional colleague you&rsquo;re registering.</p>
                )}
                <div className="mt-4 space-y-4">
                  {fields.map((field, i) => (
                    <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <LightField
                        label={`Attendee ${i + 1} Name`}
                        error={errors.groupAttendees?.[i]?.fullName?.message}
                        {...register(`groupAttendees.${i}.fullName` as const)}
                      />
                      <LightField
                        label="Email"
                        type="email"
                        error={errors.groupAttendees?.[i]?.email?.message}
                        {...register(`groupAttendees.${i}.email` as const)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        aria-label="Remove attendee"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-danger/40 hover:text-danger"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" variant="primary" loading={isSubmitting} className="w-full sm:w-auto">
              Complete Registration
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
