// Design-system primitives entry point. New code should import from here.
//
// A few of these still physically live under components/ui/ rather than in
// this folder — Button, Skeleton, Avatar, NumberedBadge, Banner, Reveal/
// RevealText, ConfirmDialog, CreatableCombobox, ImagePicker,
// PasswordStrengthMeter and FormField are each used by 20-80+ files,
// including the admin panel and the two retired homepage variants (Home.tsx/
// NewHome.tsx, kept in the repo but out of active routes — see config/
// redirects.ts). Physically relocating them would mean touching admin code
// this restructure deliberately isn't scoped to, and tsconfig's `include:
// ["src"]` still type-checks the retired pages, so their imports can't
// break either. Re-exporting them here gives new feature code one clean
// import path with zero risk to any existing consumer; the physical move
// can happen later if/when admin gets its own restructure pass.
export { Button, ButtonLink, buttonClasses } from '../../components/ui/Button';
export { Skeleton, SkeletonRows } from '../../components/ui/Skeleton';
export { Avatar } from '../../components/ui/Avatar';
export { NumberedBadge } from '../../components/ui/NumberedBadge';
export { Banner } from '../../components/ui/Banner';
export { Reveal } from '../../components/ui/Reveal';
export { RevealText } from '../../components/ui/RevealText';
export { ConfirmDialog } from '../../components/ui/ConfirmDialog';
export { CreatableCombobox, type ComboboxOption } from '../../components/ui/CreatableCombobox';
export { ImagePicker } from '../../components/ui/ImagePicker';
export { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter';
export { FormField } from '../../components/ui/FormField';

// Physically relocated — public-only usage, safe to move outright.
export { InitialsAvatar } from './InitialsAvatar';
export { AhfidBadge, AhfidLockup } from './AhfidBadge';
export { HoneypotField } from './HoneypotField';
