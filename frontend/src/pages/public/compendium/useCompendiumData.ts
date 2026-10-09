import { useEffect, useState } from 'react';
import {
  loadCompendium,
  type CompendiumAbstractRecord,
  type CompendiumCurrent,
  type CompendiumEdition,
} from '../../../services/compendium.service';

interface CompendiumDataState {
  loading: boolean;
  error: string | null;
  edition: CompendiumEdition | null;
  current: CompendiumCurrent | null;
  abstracts: CompendiumAbstractRecord[];
}

const INITIAL_STATE: CompendiumDataState = {
  loading: true,
  error: null,
  edition: null,
  current: null,
  abstracts: [],
};

// Shared by every compendium page that needs the abstract list (Home, the
// abstract detail page, Authors, Keywords) — About only needs edition.json
// and fetches that directly, so it isn't forced to pull the whole list too.
export const useCompendiumData = (): CompendiumDataState => {
  const [state, setState] = useState<CompendiumDataState>(INITIAL_STATE);

  useEffect(() => {
    let cancelled = false;
    loadCompendium()
      .then(({ edition, current, abstracts }) => {
        if (!cancelled) setState({ loading: false, error: null, edition, current, abstracts });
      })
      .catch(() => {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: 'The compendium could not be loaded right now. Please try again shortly.',
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
