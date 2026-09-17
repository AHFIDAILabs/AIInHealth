import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { subscribeNewsletter, type NewsletterSource } from '../../services/newsletter.service';
import { getApiErrorMessage } from '../../services/api';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});
type FormValues = z.infer<typeof schema>;

interface NewsletterCaptureProps {
  photo: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  source: NewsletterSource;
  successMessage: string;
}

// Low-friction two-field form laid over a photo — see brief section #4.
export const NewsletterCapture = ({ photo, eyebrow, title, body, cta, source, successMessage }: NewsletterCaptureProps) => {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitError('');
    try {
      await subscribeNewsletter({ ...values, source });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-navy py-24">
      <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-navy/95 via-navy/90 to-navy/80" />

      <Reveal className="relative mx-auto max-w-lg px-4 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-orange">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>

        {isSubmitSuccessful ? (
          <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-8 backdrop-blur-sm">
            <CheckCircle2 size={28} className="text-orange" />
            <p className="font-display text-base font-semibold text-white">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8">
            {submitError && (
              <p className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                {submitError}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <input
                  {...register('firstName')}
                  placeholder="First name"
                  className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-base sm:text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-orange/50 focus:outline-none"
                />
                {errors.firstName && <p className="mt-1.5 text-left text-xs text-danger">{errors.firstName.message}</p>}
              </div>
              <div className="flex-1">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-3 text-base sm:text-sm text-white placeholder:text-slate-400 backdrop-blur-sm focus:border-orange/50 focus:outline-none"
                />
                {errors.email && <p className="mt-1.5 text-left text-xs text-danger">{errors.email.message}</p>}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange/25 transition-all hover:scale-[1.02] hover:bg-orange-hover disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? 'Submitting…' : cta}
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </Reveal>
    </section>
  );
};
