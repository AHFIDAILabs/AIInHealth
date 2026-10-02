import type { RapporteurDraftPatch } from '../services/rapporteur.service';

// The offline-first guarantee for the rapporteur form: a 600ms-debounced write
// here happens with zero network involved, so notes survive a dropped
// connection even if the server PATCH (useRapporteurAutosave's longer
// debounce) hasn't gone out yet. Keyed per token, same reasoning as
// ticketQrCache.ts's per-registration keying — a shared device could
// otherwise bleed one rapporteur's draft into another's session.
const KEY_PREFIX = 'aihs_rapporteur_draft_';

export interface RapporteurDraft extends RapporteurDraftPatch {
  updatedAt: string;
}

export const getDraft = (token: string): RapporteurDraft | null => {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${token}`);
    return raw ? (JSON.parse(raw) as RapporteurDraft) : null;
  } catch {
    return null;
  }
};

export const setDraft = (token: string, draft: RapporteurDraftPatch): void => {
  try {
    const payload: RapporteurDraft = { ...draft, updatedAt: new Date().toISOString() };
    localStorage.setItem(`${KEY_PREFIX}${token}`, JSON.stringify(payload));
  } catch {
    // Private browsing / storage disabled / quota exceeded — nothing to
    // recover; the in-memory form state is still correct for this session.
  }
};

export const clearDraft = (token: string): void => {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${token}`);
  } catch {
    // Nothing to clean up if storage isn't accessible in the first place.
  }
};
