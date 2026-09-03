import { AbujaSkyline } from '../../components/ui/AbujaSkyline';
import { ButtonLink } from '../../components/ui/Button';

export const NotFound = () => (
  <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-white px-4 text-center">
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.5]"
      style={{
        backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)',
        backgroundSize: '26px 26px',
        maskImage: 'radial-gradient(ellipse 50% 60% at 50% 40%, black, transparent 75%)',
      }}
    />
    <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange/[0.06] blur-[100px]" />

    <p className="relative font-display text-7xl font-bold text-orange">404</p>
    <h1 className="relative mt-3 font-display text-2xl font-semibold text-navy">Page Not Found</h1>
    <p className="relative mt-2 max-w-sm text-slate-500">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
    <ButtonLink to="/" variant="primary" className="relative mt-8">
      Return Home
    </ButtonLink>

    <AbujaSkyline tone="onLight" className="pointer-events-none absolute bottom-0 left-0 h-24 w-full" opacity={0.18} />
  </div>
);
