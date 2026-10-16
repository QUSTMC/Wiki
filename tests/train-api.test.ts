import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDuration, winRate, entryValue, entryContext, request, GameApiError, queryInteger } from '../src/lib/train-api.ts';

test('custom query integers retain valid values and reject invalid URL values', () => {
	for (const value of ['1', '7', '100']) assert.equal(queryInteger(value, 100, 10), Number(value));
	assert.equal(queryInteger('1000', 1000, 2), 1000);
	for (const value of [null, '', '0', '-1', '101', '2.5', 'NaN', 'Infinity']) assert.equal(queryInteger(value, 100, 10), 10);
});

test('converts ticks at 20 TPS and preserves unavailable rates', () => {
	assert.equal(formatDuration(1200), '1 分');
	assert.equal(formatDuration(72623), '1 小时 0 分');
	assert.equal(formatDuration(0), '0 秒');
	assert.equal(formatDuration(undefined), '—');
	assert.equal(winRate(0, 0), '—');
	assert.equal(winRate(0, 4), '0%');
	assert.equal(winRate(7, 15), '46.67%');
});

test('keeps cumulative percentages, daily counts and kill denominators distinct', () => {
	const entry = { rank: 1, value: 25, detailRaw: { total: 4 } };
	assert.equal(entryValue('totalWinRate', entry), '25%');
	assert.equal(entryValue('totalWins', entry, true), '25');
	assert.equal(entryValue('killerAvgKills', entry), '25');
	assert.equal(entryContext('totalWinRate', entry), '4 场');
	assert.equal(entryContext('teamKillRate', entry), '4 次击杀');
	assert.equal(entryContext('playTime', entry), '');
});

test('requests JSON from the HTTPS API and propagates business and HTTP failures', async t => {
	const calls: URL[] = [];
	const mock = t.mock.method(globalThis, 'fetch', async (url: URL) => {
		calls.push(url);
		return new Response(JSON.stringify({ success: true, boards: {} }), { status: 200 });
	});
	const signal = new AbortController().signal;
	await request('api/leaderboard', { page: 2, limit: 10, minGames: 2 }, signal);
	assert.equal(calls[0].origin, 'https://train.lista233.cn');
	assert.equal(calls[0].searchParams.get('minGames'), '2');
	assert.equal(calls[0].searchParams.get('page'), '2');
	assert.equal(calls[0].searchParams.get('limit'), '10');
	mock.mock.mockImplementation(async () => new Response(JSON.stringify({ success: false, message: '未找到玩家' })));
	await assert.rejects(request('api/stats/player/missing', {}, signal), GameApiError);
	mock.mock.mockImplementation(async () => new Response(JSON.stringify({ success: false, message: '该玩家当日无对局记录', date: '2026-10-16' })));
	await assert.rejects(request('api/match-stats', {}, signal), error => error instanceof GameApiError && error.response.date === '2026-10-16');
	mock.mock.mockImplementation(async () => new Response('', { status: 503 }));
	await assert.rejects(request('api/leaderboard', {}, signal), /HTTP 503/);
});
