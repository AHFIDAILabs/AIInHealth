import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, MapPin, Clock, Send } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { LightField, LightTextArea, LightSelect } from '../../components/ui/LightField';
import { submitContactMessage, CONTACT_CATEGORIES } from '../../services/contact.service';
import { getApiErrorMessage } from '../../services/api';

const CONTACT_INFO = [
  { icon: Mail, label: 'Email', value: 'info@aihealthsummit2026.ng', href: 'mailto:info@aihealthsummit2026.ng' },
  { icon: MapPin, label: 'Venue', value: 'International Conference Centre (ICC), Abuja, Nigeria' },
  { icon: Clock, label: 'Dates', value: '19–20 October 2026' },
];

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  category: z.enum(CONTACT_CATEGORIES),
  message: z.string().trim().min(10, 'Message should be at least 10 characters'),
});
type FormValues = z.infer<typeof schema>;

export const Contact = () => {
  const [submitError, setSubmitError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { category: 'General' } });

  const onSubmit = async (values: FormValues) => {
    setSubmitError('');
    try {
      await submitContactMessage(values);
      reset(undefined, { keepIsSubmitSuccessful: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Get in Touch"
        subtitle="Questions about the Summit, partnerships, or media? Reach out — our team will route you to the right person."
      />

      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <Reveal className="lg:col-span-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Reach Us Directly</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy">Summit Secretariat</h2>
            <div className="mt-8 space-y-6">
              {CONTACT_INFO.map((c) => (
                <div key={c.label} className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-secondary text-orange">
                    <c.icon size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{c.label}</p>
                    {c.href ? (
                      <a href={c.href} className="mt-0.5 block font-medium text-navy hover:text-orange">
                        {c.value}
                      </a>
                    ) : (
                      <p className="mt-0.5 font-medium text-navy">{c.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-offwhite p-6 sm:p-8">
              {isSubmitSuccessful && (
                <p className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                  Thanks for reaching out — our team will get back to you soon.
                </p>
              )}
              {submitError && (
                <p className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                  {submitError}
                </p>
              )}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label="Full Name" error={errors.name?.message} {...register('name')} />
                  <LightField label="Email" type="email" error={errors.email?.message} {...register('email')} />
                </div>
                <LightSelect label="Category" error={errors.category?.message} {...register('category')}>
                  {CONTACT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </LightSelect>
                <LightTextArea
                  label="Message"
                  placeholder="How can we help?"
                  error={errors.message?.message}
                  {...register('message')}
                />
                <Button type="submit" variant="primary" className="w-full sm:w-auto" loading={isSubmitting}>
                  Send Message <Send size={16} className="ml-1" />
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
};
