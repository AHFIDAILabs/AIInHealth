import { describe, it, expect } from 'vitest';
import { classifyBadgeCategory } from '../utils/badgeCategory.js';

describe('classifyBadgeCategory', () => {
  it('classifies ticketCategory speaker as Speaker', () => {
    expect(classifyBadgeCategory({ ticketCategory: 'speaker' })).toBe('Speaker');
  });

  it('classifies type innovator as Innovator', () => {
    expect(classifyBadgeCategory({ type: 'innovator' })).toBe('Innovator');
  });

  it('classifies type exhibitor as Exhibitor', () => {
    expect(classifyBadgeCategory({ type: 'exhibitor' })).toBe('Exhibitor');
  });

  it('classifies ticketCategory vip as VIP', () => {
    expect(classifyBadgeCategory({ ticketCategory: 'vip' })).toBe('VIP');
  });

  it('classifies type team as Organizer', () => {
    expect(classifyBadgeCategory({ type: 'team' })).toBe('Organizer');
  });

  it('classifies ticketCategory staff as Organizer', () => {
    expect(classifyBadgeCategory({ type: 'attendee', ticketCategory: 'staff' })).toBe('Organizer');
  });

  it('classifies type volunteer as Media/Volunteer', () => {
    expect(classifyBadgeCategory({ type: 'volunteer' })).toBe('Media/Volunteer');
  });

  it('classifies ticketCategory accredited_media as Media/Volunteer', () => {
    expect(classifyBadgeCategory({ type: 'attendee', ticketCategory: 'accredited_media' })).toBe('Media/Volunteer');
  });

  it('falls through every other attendee ticketCategory to the generic Delegate', () => {
    for (const ticketCategory of [
      'international_delegate',
      'nigerian_professional',
      'student_researcher',
      'government_official',
      'abstract_presenter',
      'abstract_reviewer',
      'invited_delegate',
    ]) {
      expect(classifyBadgeCategory({ type: 'attendee', ticketCategory })).toBe('Delegate');
    }
  });

  it('falls through sponsor registrations (no ticketCategory at all) to Delegate', () => {
    expect(classifyBadgeCategory({ type: 'sponsor' })).toBe('Delegate');
  });
});
