import { api } from './api';

export interface PublicLeaderboardEntry {
  name: string;
  organization: string | null;
  score: number;
  rank: number;
}

export interface PublicLeaderboardTop3 {
  computedAt: string | null;
  top: PublicLeaderboardEntry[];
}

// GET /leaderboard/top3 — public, no portal login required. Backs the
// homepage ticker (LeaderboardTicker.tsx). Already filtered server-side to
// only leaderboardVisible entries (opt-outs/sensitive categories/team
// excluded), same as the portal's own leaderboard page.
export const fetchPublicLeaderboardTop3 = async (): Promise<PublicLeaderboardTop3> => {
  const res = await api.get<{ success: true; data: PublicLeaderboardTop3 }>('/leaderboard/top3');
  return res.data.data;
};
