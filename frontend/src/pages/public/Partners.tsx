import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { Eye, Megaphone, Link2, TrendingUp, Award, Star, Gem, Send, X, Globe2, type LucideIcon } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button, ButtonLink } from '../../components/ui/Button';
import { AhfidBadge } from '../../components/ui/AhfidBadge';
import { LightField, LightTextArea, LightSelect } from '../../components/ui/LightField';
import ahfidMark from '../../assets/images/Icon@4x.png';
import { submitPartnershipInquiry } from '../../services/inquiry.service';
import { getApiErrorMessage } from '../../services/api';
import { listPublicPartners, type AdminPartner } from '../../services/partner.service';
import { listPublicPackages, type PublicSponsorshipPackage } from '../../services/sponsorshipPackage.service';

const WHY_PARTNER = [
  { icon: Eye, label: 'Visibility & Positioning', body: 'Brand presence in front of 500+ delegates from 45+ African nations.' },
  { icon: Megaphone, label: 'Influence', body: 'A direct voice in shaping the national AI-in-health policy conversation.' },
  { icon: Link2, label: 'Access', body: 'Warm introductions across government, donors, industry, and academia.' },
  { icon: TrendingUp, label: 'Impact', body: 'Association with a summit built to deliver measurable health-system outcomes.' },
];

// Purely decorative — cycles across however many real packages come back,
// so the card grid still reads well regardless of how many an admin defines.
const TIER_ICONS: LucideIcon[] = [Gem, Star, Award];

const inquirySchema = z.object({
  organizationName: z.string().trim().min(2, "Enter your organization's name"),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  contactEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
  tierInterested: z.string().trim().optional(),
  message: z.string().trim().max(2000).optional(),
});
type InquiryValues = z.infer<typeof inquirySchema>;

export const Partners = () => {
  const [partners, setPartners] = useState<AdminPartner[]>([]);
  const [packages, setPackages] = useState<PublicSponsorshipPackage[]>([]);
  const [submitError, setSubmitError] = useState('');
  const [activePartner, setActivePartner] = useState<AdminPartner | null>(null);

  useEffect(() => {
    listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
    listPublicPackages()
      .then(setPackages)
      .catch(() => setPackages([]));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm<InquiryValues>({ resolver: zodResolver(inquirySchema) });

  // Same tier ordering as the homepage's PartnersShowcase (Title Partner
  // first, by package.tierOrder) — just without that section's per-tier
  // headings, since this strip is meant to read as one flat logo wall.
  // Partners with no package assigned (tierOrder undefined) sort last.
  const sortedPartners = [...partners].sort(
    (a, b) => (a.package?.tierOrder ?? Number.MAX_SAFE_INTEGER) - (b.package?.tierOrder ?? Number.MAX_SAFE_INTEGER)
  );

  const onSubmit = async (values: InquiryValues) => {
    setSubmitError('');
    try {
      await submitPartnershipInquiry(values);
      reset(undefined, { keepIsSubmitSuccessful: true });
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  return (
  <>
    <PageHero
      eyebrow="Partners"
      title="Let&rsquo;s Build This Together"
      subtitle="Government agencies, health institutions, industry, and donors are already backing the Summit, and there&rsquo;s room for more."
    />

    {/* Current partner logos — backed by the real GET /partners (published-only);
        a partner added and published in the admin shows up here without a code
        change. The AHFID chip is hardcoded since AHFID convenes rather than
        "partners with" itself. */}
    {partners.length > 0 && (
      <section className="border-b border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Current Partners</p>
          </Reveal>
          <Reveal delay={0.08} className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
            <div className="flex shrink-0 items-center gap-2.5 rounded-lg bg-ahfid/5 px-3 py-2">
              <img src={ahfidMark} alt="AHFID" className="h-7 w-7 rounded" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ahfid">Convener</span>
            </div>
            {sortedPartners.map((partner) => {
              const img = partner.logoUrl ? (
                <img
                  src={partner.logoUrl}
                  alt={partner.name}
                  title={partner.name}
                  className="h-9 shrink-0 object-contain"
                />
              ) : (
                <span className="shrink-0 text-sm font-semibold text-slate-500" title={partner.name}>
                  {partner.name}
                </span>
              );
              // A partner with a description is clickable to read it (admin fills
              // this in expecting it to be visible somewhere public — previously it
              // never was); one without just links straight to their site, same as
              // before.
              if (partner.description) {
                return (
                  <button key={partner._id} type="button" onClick={() => setActivePartner(partner)} aria-label={partner.name}>
                    {img}
                  </button>
                );
              }
              return partner.website ? (
                <a key={partner._id} href={partner.website} target="_blank" rel="noopener noreferrer" aria-label={partner.name}>
                  {img}
                </a>
              ) : (
                <span key={partner._id}>{img}</span>
              );
            })}
          </Reveal>
        </div>
      </section>
    )}

    {/* Why partner */}
    <section className="bg-offwhite py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-center font-display text-2xl font-semibold text-navy sm:text-3xl">Why Partner With Us</h2>
        </Reveal>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_PARTNER.map((w, i) => (
            <Reveal key={w.label} delay={i * 0.07} className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm shadow-navy/5">
                <w.icon size={22} className="text-orange" />
              </span>
              <p className="mt-4 font-semibold text-navy">{w.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{w.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* Partnership tiers — real, admin-managed packages (GET /packages), not
        hardcoded copy, so pricing/benefits changes in the admin show up here
        without a code change. */}
    {packages.length > 0 && (
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange">Partnership Packages</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-navy sm:text-3xl">Choose Your Level of Involvement</h2>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {packages.map((pkg, i) => {
              const Icon = TIER_ICONS[i % TIER_ICONS.length];
              return (
                <Reveal key={pkg._id} delay={i * 0.08}>
                  <div className="flex h-full flex-col rounded-2xl border border-slate-200 p-7 transition-colors hover:border-orange/40">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-secondary text-orange">
                      <Icon size={20} />
                    </span>
                    <p className="mt-4 font-display text-lg font-semibold text-navy">{pkg.name}</p>
                    {/* <p className="text-xs font-semibold uppercase tracking-wide text-orange">&#8358;{pkg.price.toLocaleString('en-NG')}</p> */}
                    {pkg.benefits && pkg.benefits.length > 0 && (
                      <ul className="mt-4 flex-1 space-y-2.5">
                        {pkg.benefits.map((perk) => (
                          <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    )}

    <section className="relative overflow-hidden bg-navy py-20">
      <div className="relative mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <Reveal className="lg:col-span-5">
          <AhfidBadge />
          <h2 className="mt-6 font-display text-2xl font-semibold text-white sm:text-3xl">Become a Partner</h2>
          <p className="mt-3 max-w-xl text-slate-300">
            Tell us about your organization and where you&rsquo;d like to plug in. We&rsquo;ll follow up with
            partnership options that fit.
          </p>
          <ButtonLink to="/register" variant="secondary" className="mt-6 !border-white/40 !bg-white/10">
            Register Interest Instead
          </ButtonLink>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="rounded-2xl bg-white p-6 sm:p-8">
            {isSubmitSuccessful && (
              <p className="mb-5 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
                Thanks for your interest. Our partnerships team will follow up shortly.
              </p>
            )}
            {submitError && (
              <p className="mb-5 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {submitError}
              </p>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <LightField label="Organization Name" error={errors.organizationName?.message} {...register('organizationName')} />
                <LightField label="Contact Name" error={errors.contactName?.message} {...register('contactName')} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <LightField label="Email" type="email" error={errors.contactEmail?.message} {...register('contactEmail')} />
                <LightSelect label="Package Interested" error={errors.tierInterested?.message} {...register('tierInterested')}>
                  <option value="">Not sure yet</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg.name}>
                      {pkg.name}
                    </option>
                  ))}
                </LightSelect>
              </div>
              <LightTextArea label="Message" placeholder="Tell us about your organization..." error={errors.message?.message} {...register('message')} />
              <Button type="submit" variant="primary" className="w-full sm:w-auto" loading={isSubmitting}>
                Submit Inquiry <Send size={16} className="ml-1" />
              </Button>
            </form>
          </div>
        </Reveal>
      </div>
    </section>

    <AnimatePresence>
      {activePartner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
          onClick={() => setActivePartner(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl"
          >
            <button
              onClick={() => setActivePartner(null)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              {activePartner.logoUrl ? (
                <img src={activePartner.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-secondary text-orange">
                  <Star size={20} />
                </span>
              )}
              <h3 className="font-display text-xl font-semibold text-navy">{activePartner.name}</h3>
            </div>
            {activePartner.description && (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{activePartner.description}</p>
            )}
            {activePartner.website && (
              <a
                href={activePartner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:text-orange-hover"
              >
                <Globe2 size={15} /> Visit website
              </a>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  );
};
