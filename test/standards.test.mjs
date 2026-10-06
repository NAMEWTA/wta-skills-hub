import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkStandards } from '../scripts/check-standards.mjs';
const config = { reviewedAt: '2026-10-06', reviewEveryDays: 30,
  sources: [{ id: 'spec', url: 'https://agentskills.io/specification', markers: ['SKILL.md', 'metadata'] }] };
const now = new Date('2026-10-06T12:00:00Z');
const fetcher = async () => new Response('<p>SKILL.md metadata</p>', { status: 200 });
test('standards check is deterministic offline with injected current documents', async () => {
  assert.equal((await checkStandards(config, { now, fetcher })).ok, true);
});
test('passing markers never reset or override an overdue human review', async () => {
  const result = await checkStandards(config, { now: new Date('2026-11-06'), fetcher });
  assert.equal(result.ok, false); assert.equal(result.reviewDue, true);
});
test('missing markers and network failure explicitly require review', async () => {
  assert.equal((await checkStandards(config, { now, fetcher: async () => new Response('changed') })).results[0].ok, false);
  const result = await checkStandards(config, { now, fetcher: async () => { throw new Error('network disabled'); } });
  assert.match(result.results[0].error, /network disabled/); assert.equal(result.ok, false);
});
test('redirects cannot send standards checks to an arbitrary or private host', async () => {
  let calls = 0;
  const result = await checkStandards(config, { now, fetcher: async () => { calls++; return new Response('', { status: 302, headers: { location: 'https://127.0.0.1/secret' } }); } });
  assert.equal(calls, 1); assert.equal(result.ok, false); assert.match(result.results[0].error, /Untrusted/);
});
