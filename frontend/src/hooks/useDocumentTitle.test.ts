import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from './useDocumentTitle';

describe('useDocumentTitle', () => {
  it('sets the document title with the site name suffix', () => {
    renderHook(() => useDocumentTitle('Agenda'));
    expect(document.title).toBe('Agenda | AI in Health Summit 2026');
  });

  it('updates the title when the page title changes', () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Agenda' },
    });
    expect(document.title).toBe('Agenda | AI in Health Summit 2026');

    rerender({ title: 'Speakers' });
    expect(document.title).toBe('Speakers | AI in Health Summit 2026');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'Some Previous Title';
    const { unmount } = renderHook(() => useDocumentTitle('Agenda'));
    expect(document.title).toBe('Agenda | AI in Health Summit 2026');

    unmount();
    expect(document.title).toBe('Some Previous Title');
  });
});
