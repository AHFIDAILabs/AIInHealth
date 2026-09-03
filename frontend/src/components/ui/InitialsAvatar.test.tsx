import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InitialsAvatar } from './InitialsAvatar';

describe('InitialsAvatar', () => {
  it('renders the first letter of each of the first two words as uppercase initials', () => {
    render(<InitialsAvatar name="Chidi Okafor" />);
    expect(screen.getByText('CO')).toBeInTheDocument();
  });

  it('strips honorifics (Dr./Hon./Prof.) before computing initials', () => {
    render(<InitialsAvatar name="Dr. Olubunmi Ajala" />);
    expect(screen.getByText('OA')).toBeInTheDocument();
  });

  it('handles a single-word name without crashing', () => {
    render(<InitialsAvatar name="Cher" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('is deterministic — the same name always gets the same background', () => {
    const { container: a } = render(<InitialsAvatar name="Pavel Ursu" />);
    const { container: b } = render(<InitialsAvatar name="Pavel Ursu" />);
    expect(a.firstElementChild?.className).toBe(b.firstElementChild?.className);
  });
});
