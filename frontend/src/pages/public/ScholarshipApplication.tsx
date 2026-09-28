import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Paperclip, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/Banner';
import { LightField, LightTextArea, LightSelect } from '../../components/ui/LightField';
import { RegisterSuccess } from '../../components/register/RegisterSuccess';
import {
  submitScholarshipApplication,
  uploadScholarshipDocument,
  SCHOLARSHIP_APPLICANT_TYPES,
  SCHOLARSHIP_STUDY_LEVELS,
  type ScholarshipApplicantType,
} from '../../services/scholarshipApplication.service';
import { getApiErrorMessage } from '../../services/api';
import { SEO } from '../../components/seo/SEO';

const APPLICANT_TYPE_LABEL: Record<ScholarshipApplicantType, string> = {
  employee: 'Employee',
  student: 'Student',
  other: 'Other',
};

const STUDY_LEVEL_LABEL: Record<(typeof SCHOLARSHIP_STUDY_LEVELS)[number], string> = {
  undergraduate: 'Undergraduate',
  postgraduate_masters: "Postgraduate — Master's",
  postgraduate_phd: 'Postgraduate — PhD',
  diploma_certificate: 'Diploma / Certificate',
  other: 'Other',
};

const schema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().min(5, 'Enter a valid phone number'),
    organization: z.string().trim().min(1, 'Enter your organization or institution name'),
    country: z.string().trim().min(2, 'Enter your country'),
    // z.enum(...).optional() rejects an empty string (the native <select>'s
    // unselected placeholder option) with Zod's own generic "Invalid enum
    // value" message instead of the custom ones below — accepting '' here
    // too and treating it as unset in superRefine (a falsy check already
    // covers '') keeps that a friendly, our-own message in every case.
    applicantType: z.union([z.literal(''), z.enum(SCHOLARSHIP_APPLICANT_TYPES)]),
    designation: z.string().trim().optional(),
    courseOfStudy: z.string().trim().optional(),
    level: z.union([z.literal(''), z.enum(SCHOLARSHIP_STUDY_LEVELS)]).optional(),
    reason: z.string().trim().min(50, 'Tell us a bit more — at least 50 characters').max(2000),
  })
  .superRefine((values, ctx) => {
    if (!values.applicantType) {
      ctx.addIssue({ code: 'custom', path: ['applicantType'], message: 'Choose one' });
    }
    if ((values.applicantType === 'employee' || values.applicantType === 'other') && !values.designation) {
      ctx.addIssue({ code: 'custom', path: ['designation'], message: 'Enter your designation / occupation' });
    }
    if (values.applicantType === 'student') {
      if (!values.courseOfStudy) ctx.addIssue({ code: 'custom', path: ['courseOfStudy'], message: 'Enter your course of study' });
      if (!values.level) ctx.addIssue({ code: 'custom', path: ['level'], message: 'Choose your level of study' });
    }
  });
type FormValues = z.infer<typeof schema>;

const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export const ScholarshipApplication = () => {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { applicantType: '', level: '' } });

  const reason = watch('reason') ?? '';
  const applicantType = watch('applicantType');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      setUploadError(t('scholarship.form.invalidFileType', 'Only PDF, DOCX, TXT, or MD files are allowed.'));
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const url = await uploadScholarshipDocument(file);
      setDocumentUrl(url);
      setDocumentName(file.name);
    } catch (err) {
      setUploadError(getApiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = () => {
    setDocumentUrl(null);
    setDocumentName(null);
  };

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const message = await submitScholarshipApplication({
        ...values,
        // Narrowing '' back out — superRefine already guarantees both are a
        // real enum value by the time onSubmit runs (react-hook-form only
        // calls it once validation passes), the union with '' above exists
        // purely so an unselected native <select>/segmented control fails
        // validation with our own friendly message instead of Zod's generic one.
        applicantType: values.applicantType as ScholarshipApplicantType,
        level: values.level ? (values.level as (typeof SCHOLARSHIP_STUDY_LEVELS)[number]) : undefined,
        supportingDocumentUrl: documentUrl ?? undefined,
      });
      setConfirmation(message);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    }
  };

  const resetAll = () => {
    reset();
    removeDocument();
    setConfirmation(null);
  };

  return (
    <>
      <SEO
        title="Apply for a Scholarship"
        description="Apply for a scholarship covering your registration fee for the AI in Health Summit 2026 in Abuja, Nigeria."
        path="/scholarship"
      />
      <PageHero
        eyebrow={t('scholarship.eyebrow', 'Scholarships')}
        title={t('scholarship.title', 'Apply for a Scholarship')}
        subtitle={t(
          'scholarship.subtitle',
          "Request a scholarship covering your registration fee for the AI in Health Summit 2026. Tell us a bit about yourself and why you'd like to attend."
        )}
      />

      <section className="bg-offwhite pb-16 pt-16 sm:pt-20">
        <Reveal className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-glow-subtle sm:p-9">
            {confirmation ? (
              <RegisterSuccess message={confirmation} onReset={resetAll} />
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {serverError && <Banner variant="error">{serverError}</Banner>}

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label={t('scholarship.form.fullName', 'Full Name')} error={errors.fullName?.message} {...register('fullName')} />
                  <LightField
                    label={t('scholarship.form.email', 'Email')}
                    type="email"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <LightField label={t('scholarship.form.phone', 'Phone Number')} error={errors.phone?.message} {...register('phone')} />
                  <LightField label={t('scholarship.form.country', 'Country')} error={errors.country?.message} {...register('country')} />
                </div>

                <div>
                  <p className="mb-1.5 block text-sm font-semibold text-navy">{t('scholarship.form.applicantType', 'I am a(n)')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {SCHOLARSHIP_APPLICANT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setValue('applicantType', type, { shouldValidate: true })}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                          applicantType === type
                            ? 'border-orange bg-orange/10 text-orange'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-orange/40'
                        }`}
                      >
                        {t(`scholarship.form.applicantType.${type}`, APPLICANT_TYPE_LABEL[type])}
                      </button>
                    ))}
                  </div>
                  {errors.applicantType && <p className="mt-1.5 text-xs font-medium text-danger">{errors.applicantType.message}</p>}
                </div>

                <LightField
                  label={
                    applicantType === 'student'
                      ? t('scholarship.form.organizationStudent', 'School / Institution Name')
                      : t('scholarship.form.organizationOther', 'Organization / Institution Name')
                  }
                  error={errors.organization?.message}
                  {...register('organization')}
                />

                {applicantType === 'student' ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <LightField
                      label={t('scholarship.form.courseOfStudy', 'Course of Study')}
                      error={errors.courseOfStudy?.message}
                      {...register('courseOfStudy')}
                    />
                    <LightSelect label={t('scholarship.form.level', 'Level')} error={errors.level?.message} {...register('level')}>
                      <option value="">{t('scholarship.form.chooseLevel', 'Choose…')}</option>
                      {SCHOLARSHIP_STUDY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {STUDY_LEVEL_LABEL[level]}
                        </option>
                      ))}
                    </LightSelect>
                  </div>
                ) : (
                  (applicantType === 'employee' || applicantType === 'other') && (
                    <LightField
                      label={
                        applicantType === 'employee'
                          ? t('scholarship.form.designationEmployee', 'Designation / Job Title')
                          : t('scholarship.form.designationOther', 'Occupation')
                      }
                      error={errors.designation?.message}
                      {...register('designation')}
                    />
                  )
                )}

                <div>
                  <LightTextArea
                    label={t('scholarship.form.reason', 'Why would you like to attend?')}
                    placeholder={t(
                      'scholarship.form.reasonPlaceholder',
                      'Tell us about your background and why a scholarship would help you attend (min. 50 characters)...'
                    )}
                    error={errors.reason?.message}
                    {...register('reason')}
                  />
                  <p className="mt-1.5 text-right text-xs text-slate-400">{reason.length}/2000</p>
                </div>

                <div>
                  <p className="mb-1.5 block text-sm font-semibold text-navy">
                    {t('scholarship.form.supportingDocument', 'Supporting Document (optional)')}
                  </p>
                  <p className="mb-2 text-xs text-slate-500">
                    {t('scholarship.form.supportingDocumentHint', 'PDF, DOCX, TXT, or MD — e.g. proof of student status or a letter of support.')}
                  </p>
                  {documentName ? (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-offwhite px-4 py-3 text-sm">
                      <span className="flex items-center gap-2 truncate text-navy">
                        <Paperclip size={15} className="shrink-0 text-slate-400" /> {documentName}
                      </span>
                      <button type="button" onClick={removeDocument} className="shrink-0 text-slate-400 hover:text-danger">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-500 hover:border-orange/40 hover:text-orange">
                      {uploading ? (
                        <>
                          <Loader2 size={15} className="animate-spin" /> {t('scholarship.form.uploading', 'Uploading…')}
                        </>
                      ) : (
                        <>
                          <Paperclip size={15} /> {t('scholarship.form.attachFile', 'Attach a file')}
                        </>
                      )}
                      <input
                        type="file"
                        accept={ALLOWED_DOCUMENT_EXTENSIONS.join(',')}
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  )}
                  {uploadError && <p className="mt-1.5 text-xs font-medium text-danger">{uploadError}</p>}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={isSubmitting} disabled={uploading}>
                    {t('scholarship.form.submit', 'Submit Application')} <Send size={16} className="ml-1" />
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
