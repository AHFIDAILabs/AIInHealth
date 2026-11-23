import { useCallback, useEffect, useState } from 'react';
import {
  fetchReportAccessMe,
  reportAccessLogout,
  requestReportAccessCode,
  verifyReportAccessCode,
  type ReportAccessMe,
} from '../services/reports.service';

// Drives the gate end-to-end: on mount, silently checks for an existing valid
// session (a returning visitor's cookie) before ever showing the modal —
// mirrors useAlbumIndex's `null === "not loaded yet"` loading convention.
export const useReportAccess = () => {
  const [me, setMe] = useState<ReportAccessMe | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchReportAccessMe().then((result) => {
      if (cancelled) return;
      setMe(result);
      setChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const requestCode = useCallback(async (email: string, firstName: string) => {
    await requestReportAccessCode(email, firstName);
  }, []);

  const verifyCode = useCallback(async (email: string, code: string) => {
    await verifyReportAccessCode(email, code);
    const result = await fetchReportAccessMe();
    setMe(result);
  }, []);

  const logout = useCallback(async () => {
    await reportAccessLogout();
    setMe(null);
  }, []);

  return {
    isVerified: me !== null,
    me,
    // Gate state isn't known yet on first paint — callers should render
    // nothing (or a skeleton) rather than flash the gate modal for a
    // returning, already-verified visitor.
    loading: !checked,
    requestCode,
    verifyCode,
    logout,
  };
};
