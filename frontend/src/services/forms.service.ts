import { api } from './api';

// Public form spam hardening's time-trap — see backend's formToken.service.ts.
// Every public form fetches one on mount and sends it back as `formToken` on
// submit; a bot that POSTs directly without loading the page (or submits
// faster than a human possibly could) never has a valid-aged token.
export const fetchFormToken = async (): Promise<string> => {
  const res = await api.get<{ success: true; data: { token: string; issuedAt: number } }>('/forms/token');
  return res.data.data.token;
};
