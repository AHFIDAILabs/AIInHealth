import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Send } from 'lucide-react';
import { SEO } from '../../components/seo/SEO';
import { Button } from '../../components/ui/Button';
import { LightTextArea } from '../../components/ui/LightField';
import { HoneypotField } from '../../components/ui/HoneypotField';
import { submitFeedback } from '../../services/feedback.service';
import { listPublicSessions } from '../../services/session.service';
import { getApiErrorMessage } from '../../services/api';
import { useFormToken } from '../../hooks/useFormToken';
import { GENERIC_FORM_INVALID_MESSAGE } from '../../lib/siteInfo';

const schema = z.object({
  rating: z.number().int().min(1, 'Please select a rating').max(5),
  comment: z.string().trim().max(1000).optional(),
  formMeta: z.string().max(0).optional(),
});
type FormValues = z.infer<typeof schema>;

// Anonymous session/event feedback — event-extras plan, Batch 4. Reached via
// a QR code printed at the venue (generated in the admin Feedback page);
// `sessionId` present means feedback for one specific session, absent means
// general event feedback. No sign-in, no identity collected at all.
export const Feedback = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const formToken = useFormToken();
  const [sessionTitle, setSessionTitle] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    listPublicSessions()
      .then((sessions) => {
        const match = sessions.find((s) => s._id === sessionId);
        if (match) setSessionTitle(match.title);
      })
      .catch(() => undefined);
  }, [sessionId]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { rating: 0 } });

  const rating = watch('rating');

  const onSubmit = async (values: FormValues) => {
    setSubmitError('');
    try {
      await submitFeedback({
        sessionRef: sessionId,
        rating: values.rating,
        comment: values.comment,
        formMeta: values.formMeta ?? '',
        formToken,
      });
      reset(undefined, { keepIsSubmitSuccessful: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  const onInvalid = () => setSubmitError(GENERIC_FORM_INVALID_MESSAGE);

  return (
    <>
      <SEO
        title="Session Feedback"
        description="Share your feedback on the AI in Health Summit 2026."
        path={sessionId ? `/feedback/${sessionId}` : '/feedback'}
        noindex
      />
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange">
            {sessionId ? 'Session Feedback' : 'Event Feedback'}
          </p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-navy">
            {sessionId ? sessionTitle || 'How was this session?' : 'How is the Summit going for you?'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">Anonymous — takes about 10 seconds.</p>

          {isSubmitSuccessful ? (
            <p className="mt-8 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
              Thanks for your feedback!
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="mt-6 space-y-5" noValidate>
              <HoneypotField {...register('formMeta')} />

              <div>
                <p className="mb-2 text-sm font-semibold text-navy">Rating</p>
                <div className="flex gap-1.5" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n === 1 ? '' : 's'}`}
                      onClick={() => setValue('rating', n, { shouldValidate: true })}
                      className="p-1"
                    >
                      <Star size={32} className={n <= rating ? 'fill-orange text-orange' : 'text-slate-300'} />
                    </button>
                  ))}
                </div>
                {errors.rating && <p className="mt-1.5 text-xs font-medium text-danger">{errors.rating.message}</p>}
              </div>

              <LightTextArea
                label="Comments (optional)"
                placeholder="Anything you'd like to share?"
                {...register('comment')}
              />

              {submitError && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  {submitError}
                </p>
              )}

              <Button type="submit" variant="primary" className="w-full" loading={isSubmitting}>
                Submit Feedback <Send size={16} className="ml-1" />
              </Button>
            </form>
          )}
        </div>
      </section>
    </>
  );
};
