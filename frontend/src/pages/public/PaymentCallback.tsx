import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { PageHero } from '../../components/ui/PageHero';
import { Reveal } from '../../components/ui/Reveal';
import { ButtonLink } from '../../components/ui/Button';
import { verifyPayment, type VerifyPaymentResult } from '../../services/payment.service';
import { getApiErrorMessage } from '../../services/api';
import { formatNaira } from '../../lib/pricing';

export const PaymentCallback = () => {
  const [params] = useSearchParams();
  const reference = params.get('reference') ?? params.get('trxref');
  const [result, setResult] = useState<VerifyPaymentResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reference) {
      setError('No payment reference was provided.');
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
      <PageHero eyebrow="Payment" title="Confirming Your Registration" subtitle="One moment while we verify your payment with Paystack." />

      <section className="bg-offwhite py-20">
        <Reveal className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow-subtle">
            {loading ? (
              <>
                <Loader2 size={40} className="mx-auto animate-spin text-orange" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">Verifying payment…</p>
              </>
            ) : error || !result || result.paymentStatus !== 'paid' ? (
              <>
                <XCircle size={40} className="mx-auto text-danger" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">We couldn&rsquo;t confirm this payment</p>
                <p className="mt-2 text-sm text-slate-500">
                  {error || "If you completed payment on Paystack, this may just be a delay — try refreshing in a moment, or contact us if it persists."}
                </p>
                <ButtonLink to="/register" variant="secondary" className="!mt-6 !border-slate-300 !bg-white !text-navy">
                  Back to Registration
                </ButtonLink>
              </>
            ) : (
              <>
                <CheckCircle2 size={40} className="mx-auto text-success" />
                <p className="mt-4 font-display text-lg font-semibold text-navy">You&rsquo;re confirmed, {result.fullName?.split(' ')[0]}!</p>
                <p className="mt-2 text-sm text-slate-500">
                  {formatNaira(result.amountNaira)} paid for {result.ticketCategory?.replace(/_/g, ' ')}. A confirmation email is on its way.
                </p>
                <ButtonLink to="/portal/login" variant="primary" className="!mt-6">
                  Access Your Delegate Portal
                </ButtonLink>
                <div className="mt-3">
                  <Link to="/" className="text-sm font-semibold text-slate-500 hover:text-orange">
                    Back to homepage
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
