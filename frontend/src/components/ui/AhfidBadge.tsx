import { useTranslation } from 'react-i18next';
import ahfidMark from '../../assets/images/Icon@4x.png';

/**
 * AHFID convener mark — the org's real logo asset (red square, white "ahFid"
 * letterform). Org name is "Africa Hub for Innovation & Development," never
 * "African Health Frontiers In Digital" — see the Concept Note, page 10.
 */
const AhfidMonogram = ({ size = 40 }: { size?: number }) => (
  <img
    src={ahfidMark}
    alt="AHFID"
    className="shrink-0 rounded shadow-md"
    style={{ width: size, height: size }}
  />
);

export const AhfidBadge = ({ className = '' }: { className?: string }) => {
  const { t } = useTranslation();
  return (
    <div className={`inline-flex items-center gap-2.5 rounded-md border border-ahfid/30 bg-ahfid/10 px-3 py-1.5 ${className}`}>
      <AhfidMonogram size={28} />
      <span className="font-body text-xs leading-tight text-white">
        <span className="block text-[10px] text-slate-500">{t('common.convenedBy', 'Convened by')}</span>
        <span className="block font-semibold tracking-wide">AHFID</span>
      </span>
    </div>
  );
};

export const AhfidLockup = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <AhfidMonogram size={40} />
    <div className="font-body leading-tight">
      <p className="font-semibold text-white">Africa Hub for Innovation & Development</p>
      <p className="text-sm text-slate-400">AHFID</p>
    </div>
  </div>
);
