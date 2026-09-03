interface AvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: number;
  className?: string;
}

// Shows the user's photo when they've set one; falls back to a gradient initial
// circle otherwise (same fallback everywhere — topbar, sidebar, settings preview —
// so a missing photo never looks broken, just unset).
export const Avatar = ({ name, avatarUrl, size = 36, className = '' }: AvatarProps) => {
  const style = { width: size, height: size };
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'Profile photo'}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-secondary text-xs font-bold text-white ${className}`}
    >
      {name?.[0]?.toUpperCase() ?? '?'}
    </span>
  );
};
