import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField, LightTextArea, LightSelect } from '../../components/ui/LightField';
import { RegisterSuccess } from '../../components/register/RegisterSuccess';
import { submitAbstract } from '../../services/abstract.service';
import { listTracks, type PublicTrack } from '../../services/track.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  title: z.string().trim().min(4, 'Enter a title').max(250),
  authorName: z.string().trim().min(2, 'Enter the presenting author’s name'),
  authorEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  organization: z.string().trim().optional(),
  coAuthors: z.string().trim().max(500).optional(),
  track: z.string().trim().min(1, 'Choose a track'),
  abstractText: z.string().trim().min(100, 'Abstract should be at least 100 characters').max(3000),
});
type FormValues = z.infer<typeof schema>;

export const AbstractSubmission = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [tracks, setTracks] = useState<PublicTrack[] | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { track: '' } });

  // The dropdown offers whatever tracks the Agenda admin currently has set up
  // (Sessions & Tracks tab) rather than a separate hardcoded list, so this
  // form never drifts out of sync with what the admin actually manages.
  useEffect(() => {
    listTracks()
      .then((fetched) => {
        setTracks(fetched);
        if (fetched.length > 0) setValue('track', fetched[0].name);
      })
      .catch(() => setTracks([]));
  }, [setValue]);

  const abstractText = watch('abstractText') ?? '';

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const message = await submitAbstract(values);
      setConfirmation(message);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const resetAll = () => {
    reset({ track: tracks?.[0]?.name ?? '' });
    setConfirmation(null);
  };

  return (
    <>
      <PageHero
        eyebrow="Research & Abstracts"
        title="Submit Your Abstract"
        subtitle="Share your research with the Summit's Research & Abstracts track. Accepted abstracts are featured in the Poster & Abstract sessions."
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Link
            to="/abstracts/confirmed"
            className="mb-6 flex items-center justify-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover"
          >
            View Confirmed Abstract Presentations <ArrowRight size={15} />
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {confirmation ? (
              <RegisterSuccess message={confirmation} onReset={resetAll} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {serverError && <Banner variant="error">{serverError}</Banner>}
                {tracks?.length === 0 && (
                  <Banner variant="error">No tracks are configured yet. Please check back shortly.</Banner>
                )}

                <LightField label="Abstract Title" error={errors.title?.message} {...register('title')} />

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Presenting Author" error={errors.authorName?.message} {...register('authorName')} />
                  <LightField label="Email" type="email" error={errors.authorEmail?.message} {...register('authorEmail')} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Organization" error={errors.organization?.message} {...register('organization')} />
                  <LightSelect label="Track" error={errors.track?.message} disabled={!tracks} {...register('track')}>
                    {!tracks ? (
                      <option value="">Loading tracks…</option>
                    ) : (
                      tracks.map((t) => (
                        <option key={t._id} value={t.name}>
                          {t.name}
                        </option>
                      ))
                    )}
                  </LightSelect>
                </div>

                <LightField
                  label="Co-Authors (optional)"
                  placeholder="Comma-separated names"
                  error={errors.coAuthors?.message}
                  {...register('coAuthors')}
                />

                <div>
                  <LightTextArea
                    label="Abstract"
                    placeholder="Background, methods, results, conclusion (min. 100 characters)..."
                    error={errors.abstractText?.message}
                    {...register('abstractText')}
                  />
                  <p className="mt-1.5 text-right text-xs text-slate-400">{abstractText.length}/3000</p>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSubmitting} disabled={!tracks || tracks.length === 0}>
                    Submit Abstract <Send size={16} className="ml-1" />
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
