import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, useTestDb } from './helpers.js';
import { Registration } from '../models/Registration.model.js';
import { Session } from '../models/Session.model.js';

const loginAsDelegate = async (email: string) => {
  await Registration.create({
    type: 'attendee',
    registrationMode: 'individual',
    ticketCategory: 'nigerian_professional',
    fullName: 'Bookmark Tester',
    email,
    phone: '+2348099990000',
    country: 'Nigeria',
    status: 'confirmed',
    isActive: true,
  });
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/delegate/login').send({ email });
  if (res.status !== 200) throw new Error(`Delegate login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
};

const createSession = async (title: string) =>
  Session.create({
    day: 'day1',
    startTime: '09:00',
    endTime: '10:00',
    title,
    format: 'Panel Discussion',
    room: 'Main Hall',
    isPublished: true,
  });

describe('Delegate portal — session bookmarks', () => {
  useTestDb();

  it('bookmarking a session makes it appear in /delegate/me and /delegate/bookmarks', async () => {
    const agent = await loginAsDelegate('bookmark1@example.com');
    const session = await createSession('Panel: AI in Health Policy');

    const bookmarkRes = await agent.post(`/api/v1/delegate/sessions/${session.id}/bookmark`);
    expect(bookmarkRes.status).toBe(200);

    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.bookmarkedSessionIds).toEqual([session.id]);

    const bookmarks = await agent.get('/api/v1/delegate/bookmarks');
    expect(bookmarks.status).toBe(200);
    expect(bookmarks.body.data).toHaveLength(1);
    expect(bookmarks.body.data[0].title).toBe('Panel: AI in Health Policy');
  });

  it('bookmarking twice is idempotent — no duplicate entries', async () => {
    const agent = await loginAsDelegate('bookmark2@example.com');
    const session = await createSession('Keynote: Opening Address');

    await agent.post(`/api/v1/delegate/sessions/${session.id}/bookmark`);
    await agent.post(`/api/v1/delegate/sessions/${session.id}/bookmark`);

    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.bookmarkedSessionIds).toEqual([session.id]);
  });

  it('un-bookmarking removes it from both me() and bookmarks(), and is itself idempotent', async () => {
    const agent = await loginAsDelegate('bookmark3@example.com');
    const session = await createSession('Workshop: Data Governance');

    await agent.post(`/api/v1/delegate/sessions/${session.id}/bookmark`);
    const removeOnce = await agent.delete(`/api/v1/delegate/sessions/${session.id}/bookmark`);
    expect(removeOnce.status).toBe(200);
    const removeTwice = await agent.delete(`/api/v1/delegate/sessions/${session.id}/bookmark`);
    expect(removeTwice.status).toBe(200);

    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.bookmarkedSessionIds).toEqual([]);

    const bookmarks = await agent.get('/api/v1/delegate/bookmarks');
    expect(bookmarks.body.data).toEqual([]);
  });

  it('rejects bookmarking an unpublished or nonexistent session', async () => {
    const agent = await loginAsDelegate('bookmark4@example.com');
    const unpublished = await Session.create({
      day: 'day1',
      startTime: '11:00',
      endTime: '12:00',
      title: 'Draft Session',
      format: 'Panel Discussion',
      room: 'Main Hall',
      isPublished: false,
    });

    const res = await agent.post(`/api/v1/delegate/sessions/${unpublished.id}/bookmark`);
    expect(res.status).toBe(404);

    const badId = await agent.post('/api/v1/delegate/sessions/not-a-valid-id/bookmark');
    expect(badId.status).toBe(404);
  });

  it('a since-unpublished session silently drops off the bookmarks list', async () => {
    const agent = await loginAsDelegate('bookmark5@example.com');
    const session = await createSession('Session That Gets Unpublished');
    await agent.post(`/api/v1/delegate/sessions/${session.id}/bookmark`);

    await Session.updateOne({ _id: session.id }, { $set: { isPublished: false } });

    const bookmarks = await agent.get('/api/v1/delegate/bookmarks');
    expect(bookmarks.body.data).toEqual([]);
    // me() still reports the raw id, unaffected by the OTHER session's publish state.
    const me = await agent.get('/api/v1/delegate/me');
    expect(me.body.data.bookmarkedSessionIds).toEqual([session.id]);
  });
});
