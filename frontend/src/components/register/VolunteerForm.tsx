import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Banner } from '../ui/Banner';
import { LightField, LightSelect } from '../ui/LightField';
import { RegisterSuccess } from './RegisterSuccess';
import { submitRegistration } from '../../services/registration.service';
import { getApiErrorMessage } from '../../services/api';
import { listVolunteerTracks, type PublicVolunteerTrack } from '../../services/volunteerTrack.service';
import { fetchVolunteerApplicationsStatus } from '../../services/volunteerSettings.service';

const TSHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  phone: z.string().trim().min(6, 'Enter a valid phone number'),
  // Optional — see the note above the field for why.
  accessCode: z.string().trim().max(32).optional().or(z.literal('')),
  tshirtSize: z.string().trim().optional(),
  trackSelected: z.string().trim().max(200).optional(),
});
type FormValues = z.infer<typeof schema>;

export const VolunteerForm = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [tracks, setTracks] = useState<PublicVolunteerTrack[]>([]);
  // null while loading — treated as "open" (don't flash a false "closed"
  // notice before the real status arrives); an already-issued access code is
  // never blocked by this either way, only a fresh application is.
  const [applicationsOpen, setApplicationsOpen] = useState<boolean | null>(null);
  const [closedReason, setClosedReason] = useState<string | undefined>();

  useEffect(() => {
    listVolunteerTracks().then(setTracks).catch(() => setTracks([]));
    fetchVolunteerApplicationsStatus()
      .then((status) => {
        setApplicationsOpen(status.open);
        setClosedReason(status.reason);
      })
      .catch(() => setApplicationsOpen(true));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const hasCode = !!watch('accessCode')?.trim();

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const accessCode = values.accessCode?.trim();
      const { message } = await submitRegistration({
        type: 'volunteer',
        ...values,
        accessCode: accessCode ? accessCode.toUpperCase() : undefined,
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

  // Applications closed blocks only a fresh submission (no code) — someone
  // who already has a code is someone staff already selected, so the form
  // and its Access Code field stay fully usable either way.
  const applicationsClosed = applicationsOpen === false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        {applicationsClosed
          ? "We're not accepting new volunteer applications right now — if you already have an access code from us, enter it below to confirm your spot."
          : "Interested in volunteering? Apply below. It's free, and takes a minute. If you're selected, we'll email you an access code to confirm your spot; come back here and enter it when you get it."}
      </p>

      {applicationsClosed && !hasCode && (
        <Banner variant="warning">
          {closedReason || 'Volunteer applications are closed right now.'} You can still confirm below if you already have an access code.
        </Banner>
      )}

      {serverError && <Banner variant="error">{serverError}</Banner>}

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
        <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <LightField label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        <LightSelect label="T-Shirt Size (optional)" error={errors.tshirtSize?.message} {...register('tshirtSize')}>
          <option value="">Select a size...</option>
          {TSHIRT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </LightSelect>
      </div>

      <LightSelect
        label="Which track are you interested in? (optional)"
        error={errors.trackSelected?.message}
        {...register('trackSelected')}
      >
        <option value="">Select a track...</option>
        {tracks.map((t) => (
          <option key={t._id} value={t.name}>
            {t.name}
          </option>
        ))}
      </LightSelect>

      <div>
        <LightField
          label="Access Code (optional)"
          placeholder="VOL-XXXXXX (leave blank to apply)"
          error={errors.accessCode?.message}
          {...register('accessCode')}
          className="uppercase tracking-wider"
        />
        <p className="mt-1.5 text-xs text-slate-400">Already have one? Enter it to confirm your spot instead of applying.</p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={isSubmitting} disabled={applicationsClosed && !hasCode}>
          {hasCode ? 'Confirm Volunteer Registration' : applicationsClosed ? 'Applications Closed' : 'Submit Application'}
        </Button>
      </div>
    </form>
  );
};
