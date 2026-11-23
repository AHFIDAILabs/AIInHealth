import type { ReportEntry } from '../../content/2026/reports';

export type { ReportEntry };

// A session groups 1+ ReportEntry rows sharing the same sessionId — the
// library/session pages' actual unit of navigation (a visitor downloads e.g.
// "the Session Report" or "the White Paper" for one session, not a bare id).
export interface ReportSession {
  sessionId: string;
  sessionTitle: string;
  venue: string;
  day: 1 | 2 | null;
  dayInferred: boolean;
  partners: string[];
  docs: ReportEntry[];
}
