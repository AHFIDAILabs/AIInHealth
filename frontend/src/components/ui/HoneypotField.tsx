import { forwardRef, type InputHTMLAttributes } from 'react';

// Public form spam hardening's honeypot — visually hidden off-screen rather
// than `display:none`/`type="hidden"`, which some bots are coded to skip
// right over. A real visitor never sees or tabs into it; anything that
// scrapes the form's actual rendered inputs and fills every one of them trips
// the backend's `max(0)` validation on this field's name.
export const HoneypotField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { name: string }>(
  ({ name, ...rest }, ref) => (
    <input
      ref={ref}
      type="text"
      name={name}
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
      {...rest}
    />
  )
);
HoneypotField.displayName = 'HoneypotField';
