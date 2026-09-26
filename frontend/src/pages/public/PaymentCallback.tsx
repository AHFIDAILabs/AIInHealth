import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { verifyPayment, type VerifyPaymentResult } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/api';
import { formatNaira } from '../../lib/pricing';

export const PaymentCallback = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) {
      setError(t('paymentCallback.errors.noReference', 'No payment reference was provided.'));
      setLoading(false);
      return;
    }
    verifyPayment(reference)
      .then(setResult)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [reference]);

  return (
    <>
      <PageHero
        eyebrow={t('paymentCallback.eyebrow', 'Payment')}
        title={t('paymentCallback.title', 'Confirming Your Registration')}
        subtitle={t('paymentCallback.subtitle', 'One moment while we verify your payment with Paystack.')}
      />

      <section className="bg-offwhite py-20">
        <Reveal className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
            {loading ? (
              <>
                <Loader2 size={40} className="mx-auto animate-spin text-orange" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">{t('paymentCallback.verifying', 'Verifying payment…')}</p>
              </>
            ) : error || !result || result.paymentStatus !== 'paid' ? (
              <>
                <XCircle size={40} className="mx-auto text-danger" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">
                  {t('paymentCallback.failed.heading', 'We couldn’t confirm this payment')}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {error ||
                    t(
                      'paymentCallback.failed.fallbackMessage',
                      'If you completed payment on Paystack, this may just be a delay. Try refreshing in a moment, or contact us if it persists.'
                    )}
                </p>
                <ButtonLink to="/register" variant="secondary" className="!mt-6 !border-slate-300 !bg-white !text-navy">
                  {t('paymentCallback.failed.backToRegistration', 'Back to Registration')}
                </ButtonLink>
              </>
            ) : (
              <>
                <CheckCircle2 size={40} className="mx-auto text-success" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">
                  {t('paymentCallback.success.heading', 'You’re confirmed, {{name}}!', { name: result.fullName?.split(' ')[0] })}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t('paymentCallback.success.detail', '{{amount}} paid for {{category}}. A confirmation email is on its way.', {
                    amount: formatNaira(result.amountNaira),
                    category: result.ticketCategory?.replace(/_/g, ' '),
                  })}
                </p>
                <ButtonLink to="/portal/login" variant="primary" className="!mt-6">
                  {t('paymentCallback.success.accessPortal', 'Access Your Delegate Portal')}
                </ButtonLink>
                <div className="mt-3">
                  <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-orange">
                    {t('paymentCallback.success.backHome', 'Back to homepage')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </section>
    </>
  );
};
