import { useEffect, useState } from 'react';
import { fetchFormToken } from '../services/forms.service';

// Shared by every public form that needs the spam-hardening time-trap token
// (Contact, Partnership Inquiry, all 6 registration forms) — fetches once on
// mount, silently gives up on failure (the token layer no-ops server-side if
// this never arrives, same graceful-degrade as everything else in that
// layer; a form must never be blockable by this fetch failing).
export const useFormToken = (): string => {
  const [token, setToken] = useState('');
  useEffect(() => {
    fetchFormToken()
      .then(setToken)
      .catch(() => undefined);
  }, []);
  return token;
};
