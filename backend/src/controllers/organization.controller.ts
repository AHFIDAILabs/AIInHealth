import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { toCsv } from '../utils/toCsv.js';
import { Registration } from '../models/Registration.model.js';
import {
  listOrganizationsQuerySchema,
  ORGANIZATION_PARTICIPANT_TYPES,
  type ListOrganizationsQuery,
} from '../validations/organization.validation.js';

// Free-text `organization` means the same institution often appears under
// several different spellings/casings (confirmed live: "Ahmadu Bello
// University, Zaria" alone had 9 distinct raw variants) — grouping on exact
// string equality would wildly overcount real unique organizations. This
// normalizes case and whitespace only (never alters the stored data, never
// attempts fuzzy/abbreviation matching — "ABU" and "Ahmadu Bello University"
// still group separately, since merging those automatically risks wrongly
// combining two actually-different organizations). Sorting the final list
// alphabetically by displayName at least clusters near-duplicates next to
// each other for an admin to spot and handle manually.
const normalize = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, ' ');

interface OrganizationGroup {
  displayName: string;
  count: number;
  types: string[];
  rawVariants: string[];
}

const buildGroups = async (query: ListOrganizationsQuery): Promise<{ groups: OrganizationGroup[]; totalRegistrations: number }> => {
  const filter: Record<string, unknown> = {
    status: 'confirmed',
    type: query.type ?? { $in: ORGANIZATION_PARTICIPANT_TYPES },
    organization: { $nin: [null, ''] },
  };

  const registrations = await Registration.find(filter).select('organization type').lean();

  const byNormalized = new Map<string, { counts: Map<string, number>; types: Set<string> }>();
  for (const r of registrations) {
    const org = r.organization as string | undefined;
    if (!org) continue;
    const key = normalize(org);
    if (!byNormalized.has(key)) byNormalized.set(key, { counts: new Map(), types: new Set() });
    const entry = byNormalized.get(key)!;
    entry.counts.set(org, (entry.counts.get(org) ?? 0) + 1);
    entry.types.add(r.type as string);
  }

  let groups: OrganizationGroup[] = Array.from(byNormalized.entries()).map(([, entry]) => {
    // Display name = the most common exact spelling within the group (ties
    // broken alphabetically) — tends to surface however most people
    // actually typed it, not an arbitrary pick.
    const variants = Array.from(entry.counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return {
      displayName: variants[0][0],
      count: Array.from(entry.counts.values()).reduce((sum, c) => sum + c, 0),
      types: Array.from(entry.types).sort(),
      rawVariants: variants.map(([name]) => name).sort((a, b) => a.localeCompare(b)),
    };
  });

  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    groups = groups.filter((g) => g.rawVariants.some((v) => rx.test(v)));
  }

  groups.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { groups, totalRegistrations: registrations.length };
};

// GET /admin/organizations — every confirmed participant's organization,
// grouped (case/whitespace-normalized) across every real participant type
// (not just attendees). No pagination: even ungrouped, this is a few hundred
// rows at most — well within a single browser table's reach, and pagination
// would make the summary figures below misleading (computed over one page
// instead of everything).
export const adminList = catchAsync(async (req: Request, res: Response) => {
  const query = listOrganizationsQuerySchema.parse(req.query);
  const { groups, totalRegistrations } = await buildGroups(query);

  const byType: Record<string, number> = {};
  for (const type of ORGANIZATION_PARTICIPANT_TYPES) {
    byType[type] = groups.reduce((sum, g) => sum + (g.types.includes(type) ? 1 : 0), 0);
  }

  res.json(
    new ApiResponse(groups, {
      totalRegistrations,
      uniqueOrganizations: groups.length,
      byType,
    })
  );
});

const EXPORT_CSV_COLUMNS = ['displayName', 'count', 'types', 'rawVariants'];

export const adminExport = catchAsync(async (req: Request, res: Response) => {
  const query = listOrganizationsQuerySchema.parse(req.query);
  const { groups } = await buildGroups(query);

  const csv = toCsv(groups as unknown as Record<string, unknown>[], EXPORT_CSV_COLUMNS);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="organizations-${Date.now()}.csv"`);
  res.send(csv);
});
