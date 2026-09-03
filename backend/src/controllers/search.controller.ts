import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { globalSearchQuerySchema } from '../validations/search.validation.js';
import { Registration } from '../models/Registration.model.js';
import { Speaker } from '../models/Speaker.model.js';
import { Session } from '../models/Session.model.js';
import { Partner } from '../models/Partner.model.js';
import { Innovation } from '../models/Innovation.model.js';
import { Abstract } from '../models/Abstract.model.js';
import { PartnershipInquiry } from '../models/PartnershipInquiry.model.js';
import { ContactMessage } from '../models/ContactMessage.model.js';
import { User } from '../models/User.model.js';
import { EventTeamMember } from '../models/EventTeamMember.model.js';
import type { Role } from '../types/enums.js';

const RESULT_LIMIT = 5;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

interface SearchResource {
  key: string;
  label: string;
  // Mirrors that resource's GET list route in admin.routes.ts exactly — global
  // search must never surface a result a role couldn't otherwise reach by
  // visiting that resource's own list page directly.
  roles: Role[];
  search: (rx: RegExp, q: string) => Promise<SearchResult[]>;
}

const RESOURCES: SearchResource[] = [
  {
    key: 'registrations',
    label: 'Registrations',
    roles: ['super_admin', 'registrations_officer', 'viewer', 'content_editor'],
    search: async (rx, q) => {
      const docs = await Registration.find({
        $or: [
          { fullName: rx },
          { email: rx },
          { organization: rx },
          { companyName: rx },
          { contactName: rx },
          { contactEmail: rx },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(RESULT_LIMIT)
        .select('fullName companyName contactName email contactEmail organization type');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.fullName || d.companyName || d.contactName || 'Unnamed submission',
        subtitle: [d.email || d.contactEmail, d.organization || d.companyName].filter(Boolean).join(' · '),
        path: `/admin/registrations?q=${encodeURIComponent(q)}`,
      }));
    },
  },
  {
    key: 'speakers',
    label: 'Speakers',
    roles: ['super_admin', 'content_editor'],
    search: async (rx, q) => {
      const docs = await Speaker.find({ $or: [{ fullName: rx }, { title: rx }, { organization: rx }] })
        .sort({ fullName: 1 })
        .limit(RESULT_LIMIT)
        .select('fullName title organization');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.fullName,
        subtitle: [d.title, d.organization].filter(Boolean).join(' · '),
        path: `/admin/speakers?q=${encodeURIComponent(q)}`,
      }));
    },
  },
  {
    key: 'sessions',
    label: 'Sessions',
    roles: ['super_admin', 'content_editor'],
    search: async (rx) => {
      const docs = await Session.find({ $or: [{ title: rx }, { room: rx }] })
        .sort({ day: 1, startTime: 1 })
        .limit(RESULT_LIMIT)
        .select('title room day startTime');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.title,
        subtitle: [d.day, d.startTime, d.room].filter(Boolean).join(' · '),
        path: '/admin/sessions',
      }));
    },
  },
  {
    key: 'partners',
    label: 'Partners',
    roles: ['super_admin', 'content_editor'],
    search: async (rx, q) => {
      const docs = await Partner.find({ name: rx }).sort({ name: 1 }).limit(RESULT_LIMIT).select('name tier category');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.name,
        subtitle: [d.tier, d.category].filter(Boolean).join(' · '),
        path: `/admin/partners?q=${encodeURIComponent(q)}`,
      }));
    },
  },
  {
    key: 'innovations',
    label: 'Innovations',
    roles: ['super_admin', 'content_editor'],
    search: async (rx, q) => {
      const docs = await Innovation.find({
        $or: [{ name: rx }, { organization: rx }, { founderName: rx }, { tagline: rx }],
      })
        .sort({ name: 1 })
        .limit(RESULT_LIMIT)
        .select('name organization founderName');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.name,
        subtitle: [d.founderName, d.organization].filter(Boolean).join(' · '),
        path: `/admin/innovations?q=${encodeURIComponent(q)}`,
      }));
    },
  },
  {
    key: 'abstracts',
    label: 'Abstracts',
    roles: ['super_admin', 'content_editor'],
    search: async (rx, q) => {
      const docs = await Abstract.find({
        $or: [{ title: rx }, { authorName: rx }, { authorEmail: rx }, { organization: rx }],
      })
        .sort({ createdAt: -1 })
        .limit(RESULT_LIMIT)
        .select('title authorName organization');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.title,
        subtitle: [d.authorName, d.organization].filter(Boolean).join(' · '),
        path: `/admin/abstracts?q=${encodeURIComponent(q)}`,
      }));
    },
  },
  {
    key: 'inquiries',
    label: 'Partnership Inquiries',
    roles: ['super_admin', 'content_editor'],
    search: async (rx) => {
      const docs = await PartnershipInquiry.find({ $or: [{ organizationName: rx }, { contactName: rx }, { contactEmail: rx }] })
        .sort({ createdAt: -1 })
        .limit(RESULT_LIMIT)
        .select('organizationName contactName contactEmail');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.organizationName,
        subtitle: [d.contactName, d.contactEmail].filter(Boolean).join(' · '),
        path: '/admin/inquiries',
      }));
    },
  },
  {
    key: 'messages',
    label: 'Contact Messages',
    roles: ['super_admin', 'content_editor'],
    search: async (rx) => {
      const docs = await ContactMessage.find({ $or: [{ name: rx }, { email: rx }] })
        .sort({ createdAt: -1 })
        .limit(RESULT_LIMIT)
        .select('name email category');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.name,
        subtitle: [d.email, d.category].filter(Boolean).join(' · '),
        path: '/admin/messages',
      }));
    },
  },
  {
    key: 'users',
    label: 'Staff Accounts',
    roles: ['super_admin'],
    // No ?q= here — UsersPage has no search box to seed (staff lists are short
    // enough that landing on the plain list is enough).
    search: async (rx) => {
      const docs = await User.find({ $or: [{ fullName: rx }, { email: rx }] })
        .sort({ fullName: 1 })
        .limit(RESULT_LIMIT)
        .select('fullName email role');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.fullName,
        subtitle: [d.email, d.role].filter(Boolean).join(' · '),
        path: '/admin/users',
      }));
    },
  },
  {
    key: 'eventTeam',
    label: 'Event Team',
    roles: ['super_admin'],
    search: async (rx, q) => {
      const docs = await EventTeamMember.find({ $or: [{ fullName: rx }, { role: rx }] })
        .sort({ fullName: 1 })
        .limit(RESULT_LIMIT)
        .select('fullName role');
      return docs.map((d) => ({
        id: d.id as string,
        title: d.fullName,
        subtitle: d.role,
        path: `/admin/event-team?q=${encodeURIComponent(q)}`,
      }));
    },
  },
];

// GET /admin/search?q= — every authenticated admin role can call this (mounted
// under requireAuth in admin.routes.ts); which resources actually get queried is
// narrowed per-role below rather than at the route level, since no single role
// list covers every resource here the way it does for a single-entity endpoint.
export const globalSearch = catchAsync(async (req: Request, res: Response) => {
  const { q } = globalSearchQuerySchema.parse(req.query);
  const rx = new RegExp(escapeRegex(q), 'i');
  const role = req.user!.role;

  const applicable = RESOURCES.filter((r) => r.roles.includes(role));
  const settled = await Promise.all(applicable.map((r) => r.search(rx, q)));

  const groups = applicable
    .map((r, i) => ({ key: r.key, label: r.label, results: settled[i] }))
    .filter((g) => g.results.length > 0);

  const total = groups.reduce((sum, g) => sum + g.results.length, 0);

  res.json(new ApiResponse({ groups, total }));
});
