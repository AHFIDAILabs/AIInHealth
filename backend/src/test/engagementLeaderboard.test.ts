import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { MeetingRequest } from '../models/MeetingRequest.model.js';
import { LeaderboardMeta } from '../models/LeaderboardMeta.model.js';
import { runEngagementScoreRecomputeNow } from '../jobs/engagementScore.job.js';

const loginAsDelegate = async (email: string, overrides: Partial<Record<string, unknown>> = {}) => {
  const registration = await Registration.create({
    type: 'attendee',
    registrationMode: 'individual',
    ticketCategory: 'nigerian_professional',
    fullName: 'Leaderboard Tester',
    email,
    phone: '+2348099990000',
    country: 'Nigeria',
    status: 'confirmed',
    isActive: true,
    ...overrides,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/delegate/login').send({ email });
  if (res.status !== 200) throw new Error(`Delegate login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, registration };
};

describe('Engagement Score + Leaderboard', () => {
  useTestDb();

  it('excludes team-type registrations and non-opted-in sensitive categories from the public board, even with a high raw score', async () => {
    const { agent: topAgent, registration: top } = await loginAsDelegate('top@example.com', {
      checkedIn: true,
      avatarUrl: 'https://example.com/photo.jpg',
    });
    const { registration: teamReg } = await loginAsDelegate('team@example.com', {
      type: 'team',
      ticketCategory: 'staff',
      checkedIn: true,
      avatarUrl: 'https://example.com/photo.jpg',
    });
    const { registration: sensitiveReg } = await loginAsDelegate('minister@example.com', {
      ticketCategory: 'government_official',
      checkedIn: true,
      avatarUrl: 'https://example.com/photo.jpg',
    });

    await runEngagementScoreRecomputeNow();

    const res = await topAgent.get('/api/v1/delegate/leaderboard');
    expect(res.status).toBe(200);
    const ids = res.body.data.top.map((e: { id: string }) => e.id);
    expect(ids).toContain(top.id);
    expect(ids).not.toContain(teamReg.id);
    expect(ids).not.toContain(sensitiveReg.id);
  });

  it('opting a sensitive-category delegate in surfaces them after the next recompute, ranked only among the visible set', async () => {
    const { agent } = await loginAsDelegate('vip@example.com', {
      ticketCategory: 'vip',
      checkedIn: true,
    });
    await loginAsDelegate('ordinary@example.com', { checkedIn: true });

    await runEngagementScoreRecomputeNow();
    const before = await agent.get('/api/v1/delegate/leaderboard');
    expect(before.body.data.you.visible).toBe(false);
    expect(before.body.data.you.rank).toBeNull();

    const optInRes = await agent.patch('/api/v1/delegate/leaderboard-opt-in').send({ leaderboardOptIn: true });
    expect(optInRes.status).toBe(200);

    await runEngagementScoreRecomputeNow();
    const after = await agent.get('/api/v1/delegate/leaderboard');
    expect(after.body.data.you.visible).toBe(true);
    expect(after.body.data.you.rank).not.toBeNull();
  });

  it('scores distinct accepted meeting counterparts, not raw accepted-request count — the collusion fix', async () => {
    const { agent, registration: a } = await loginAsDelegate('networker-a@example.com');
    const { registration: b } = await loginAsDelegate('networker-b@example.com');

    // Two separate accepted requests between the SAME pair should only count as one counterpart.
    await MeetingRequest.create({ fromRegistration: a._id, toRegistration: b._id, status: 'accepted' });
    await MeetingRequest.create({ fromRegistration: b._id, toRegistration: a._id, status: 'accepted' });

    await runEngagementScoreRecomputeNow();

    const res = await agent.get('/api/v1/delegate/leaderboard');
    expect(res.body.data.you.breakdown.meetings).toBe(10); // 1 distinct counterpart * 10, not 2 * 10
  });

  it('GET /delegate/me reflects engagementScore/engagementRank/leaderboardOptIn right after a recompute', async () => {
    const { agent } = await loginAsDelegate('me-check@example.com', { checkedIn: true });
    await runEngagementScoreRecomputeNow();

    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.engagementScore).toBe(20);
    expect(me.body.data.engagementRank).not.toBeNull();
    expect(me.body.data.leaderboardOptIn).toBeNull(); // never explicitly set
  });

  it('updates LeaderboardMeta.lastComputedAt after a run', async () => {
    const before = await LeaderboardMeta.findOne();
    expect(before).toBeNull();

    await runEngagementScoreRecomputeNow();

    const after = await LeaderboardMeta.findOne();
    expect(after?.lastComputedAt).toBeTruthy();
  });
});
