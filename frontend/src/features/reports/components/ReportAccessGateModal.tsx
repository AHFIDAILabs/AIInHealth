import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { X, FileLock2, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LightField } from '../../../components/ui/LightField';
import { Button } from '../../../components/ui/Button';
import { getApiErrorMessage } from '../../../services/api';

type RequestValues = { email: string; firstName: string };
type VerifyValues = { code: string };

interface ReportAccessGateModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  requestCode: (email: string, firstName: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<void>;
}

// Two-step email gate for the Reports Library — overlay structure copied from
// SessionRsvpModal.tsx. Step 1 (email + first name) issues a reusable access
// code by email and merges into the Newsletter list (reports.controller.ts's
// requestAccessCode); step 2 verifies that code into a ~6-month session, so a
// returning visitor downloading more of the 55 reports never sees this again.
export const ReportAccessGateModal = ({ open, onClose, onVerified, requestCode, verifyCode }: ReportAccessGateModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const requestSchema = z.object({
    email: z.string().trim().toLowerCase().email(t('reportsGate.emailInvalid', 'Enter a valid email')),
    firstName: z.string().trim().min(1, t('reportsGate.firstNameRequired', 'Enter your first name')),
  });
  const verifySchema = z.object({
    code: z.string().trim().min(1, t('reportsGate.codeRequired', 'Enter your access code')),
  });

  const requestForm = useForm<RequestValues>({ resolver: zodResolver(requestSchema) });
  const verifyForm = useForm<VerifyValues>({ resolver: zodResolver(verifySchema) });

  const reset = () => {
    setStep('request');
    setSubmittedEmail('');
    setRequestError(null);
    setVerifyError(null);
    requestForm.reset();
    verifyForm.reset();
  };

  const close = () => {
    onClose();
    setTimeout(reset, 200);
  };

  const onRequestSubmit = async (values: RequestValues) => {
    setRequestError(null);
    try {
      await requestCode(values.email, values.firstName);
      setSubmittedEmail(values.email);
      setStep('verify');
    } catch (err) {
      setRequestError(getApiErrorMessage(err, t('reportsGate.genericError', "That didn't work. Please try again.")));
    }
  };

  const onVerifySubmit = async (values: VerifyValues) => {
    setVerifyError(null);
    try {
      await verifyCode(submittedEmail, values.code);
      onVerified();
      reset();
    } catch (err) {
      setVerifyError(getApiErrorMessage(err, t('reportsGate.codeInvalid', "That code didn't work. Please try again.")));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
          >
            <button
              onClick={close}
              aria-label={t('common.close', 'Close')}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-offwhite hover:text-navy"
            >
              <X size={18} />
            </button>

            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange/10 text-orange">
              {step === 'request' ? <FileLock2 size={20} /> : <KeyRound size={20} />}
            </span>

            {step === 'request' ? (
              <>
                <h3 className="mt-3.5 font-compendium-serif text-lg font-bold text-compendium-ink">
                  {t('reportsGate.requestTitle', 'Download this report')}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t(
                    'reportsGate.requestIntro',
                    "Enter your email and we'll send a one-time access code — verify once, then download any report in the Library without doing this again."
                  )}
                </p>
                <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} noValidate className="mt-5 space-y-4">
                  <LightField
                    label={t('reportsGate.firstNameLabel', 'First name')}
                    error={requestForm.formState.errors.firstName?.message}
                    {...requestForm.register('firstName')}
                  />
                  <LightField
                    label={t('reportsGate.emailLabel', 'Email')}
                    type="email"
                    error={requestForm.formState.errors.email?.message}
                    {...requestForm.register('email')}
                  />
                  {requestError && <p className="text-sm text-danger">{requestError}</p>}
                  <Button type="submit" variant="primary" loading={requestForm.formState.isSubmitting} className="!w-full">
                    {t('reportsGate.sendCode', 'Send my access code')}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <h3 className="mt-3.5 font-compendium-serif text-lg font-bold text-compendium-ink">{t('reportsGate.verifyTitle', 'Enter your code')}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t('reportsGate.verifyIntro', 'We sent a code to {{email}}. Enter it below to verify.', { email: submittedEmail })}
                </p>
                <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} noValidate className="mt-5 space-y-4">
                  <LightField
                    label={t('reportsGate.codeLabel', 'Access code')}
                    placeholder="RL-XXXXXX"
                    error={verifyForm.formState.errors.code?.message}
                    {...verifyForm.register('code')}
                  />
                  {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
                  <Button type="submit" variant="primary" loading={verifyForm.formState.isSubmitting} className="!w-full">
                    {t('reportsGate.verify', 'Verify & download')}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full text-center text-xs font-medium text-slate-400 hover:text-navy"
                  >
                    {t('reportsGate.useDifferentEmail', 'Use a different email')}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
