import test from 'node:test';
import assert from 'node:assert/strict';
import { biliOptions, biliImage, normalizeBiliItems, filterBiliItems } from '../src/lib/bili-data.ts';
import { createBiliService, wbiKey, wbiQuery } from '../src/lib/bili-service.ts';
import { handleBili } from '../src/lib/bili-handler.ts';
import { renderBiliList } from '../src/lib/bili-render.ts';

const raw = (id: string, time: number, type = 'DYNAMIC_TYPE_AV') => ({ id_str: id, type, modules: {
	module_author: { pub_ts: time }, module_dynamic: { desc: { text: '<script>alert(1)</script> 动态' },
		major: type === 'DYNAMIC_TYPE_AV' ? { archive: { title: '视频标题', cover: 'https://i0.hdslb.com/bfs/test.jpg' } }
			: { opus: { title: '图文标题', pics: [{ url: 'https://i0.hdslb.com/bfs/draw.jpg' }], summary: { text: '正文' } } } },
} });
const img = 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png';
const sub = 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png';

test('validates bounded parameters and normalizes types, ordering, deduplication and media URLs', () => {
	assert.deepEqual(biliOptions('1933142349'), { uid: '1933142349', limit: 10, type: 'all' });
	for (const args of [['0'], ['abc'], ['12', 21], ['12', 1.5], ['12', 0], ['12', 10, 'bad']]) assert.throws(() => biliOptions(...args as [unknown, unknown?, unknown?]));
	const items = normalizeBiliItems([raw('1', 100), raw('2', 300, 'DYNAMIC_TYPE_DRAW'), raw('1', 100), raw('3', 200, 'DYNAMIC_TYPE_WORD'), {}]);
	assert.deepEqual(items.map(item => item.id), ['2', '3', '1']);
	assert.equal(filterBiliItems(items, biliOptions('12', 1, 'video'))[0].id, '1');
	assert.equal(filterBiliItems(items, biliOptions('12', 10, 'image')).length, 2);
	assert.equal(biliImage('https://evil.example/image.jpg'), undefined);
	assert.equal(biliImage('javascript:alert(1)'), undefined);
	assert.equal(biliImage(biliImage('//i0.hdslb.com/x.jpg')), 'https://i0.hdslb.com/x.jpg@640w_360h_1c.webp');
	const html = renderBiliList(items);
	assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>')); assert.ok(html.includes('referrerpolicy="no-referrer"'));
	assert.ok(html.includes('https://t.bilibili.com/2'));
});

test('WBI permutes the key and signs canonical, sanitized query parameters', () => {
	assert.equal(wbiKey(img, sub), 'ea1db124af3c7062474693fa704f4ff8');
	const query = wbiQuery({ z: "!()*' hello", a: '中文' }, wbiKey(img, sub), 1702204169);
	assert.ok(query.startsWith('a=%E4%B8%AD%E6%96%87&wts=1702204169&z=%20hello&w_rid='));
	assert.match(query, /w_rid=[a-f0-9]{32}$/);
	assert.equal(query, wbiQuery({ a: '中文', z: ' hello' }, wbiKey(img, sub), 1702204169));
});

test('upstream client bootstraps visitor identity, signs pages and coalesces/cache hits', async () => {
	const calls: string[] = [];
	const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
		const parsed = new URL(String(url)); calls.push(parsed.pathname);
		if (parsed.pathname.endsWith('/spi')) return Response.json({ code: 0, data: { b_3: 'visitor3', b_4: 'visitor4' } });
		if (parsed.pathname.endsWith('/nav')) return Response.json({ code: -101, data: { wbi_img: { img_url: img, sub_url: sub } } });
		assert.ok(parsed.searchParams.get('w_rid')); assert.match(String((init?.headers as Record<string, string>).Cookie), /buvid3=visitor3/);
		assert.equal((init?.headers as Record<string, string>).Referer, 'https://space.bilibili.com/12/');
		return Response.json({ code: 0, data: { items: parsed.searchParams.has('offset') ? [raw('2', 300)] : [raw('1', 100)], has_more: !parsed.searchParams.has('offset'), offset: 'next' } });
	};
	const get = createBiliService(fetcher as typeof fetch); const options = biliOptions('12', 2);
	const [a, b] = await Promise.all([get(options), get(options)]);
	assert.deepEqual(a, b); assert.deepEqual(a.items.map(item => item.id), ['2', '1']); assert.equal(calls.length, 4);
	await get(options); assert.equal(calls.length, 4);
});

test('risk control stops retries and stale successful data survives upstream failure', async t => {
	let now = Date.now(); t.mock.method(Date, 'now', () => now);
	let failed = false; let calls = 0;
	const fetcher = async (url: string | URL | Request) => {
		calls++; if (failed) return new Response('', { status: 412 });
		if (String(url).includes('/nav')) return Response.json({ code: -101, data: { wbi_img: { img_url: img, sub_url: sub } } });
		return Response.json({ code: 0, data: { items: [raw('1', 100)], has_more: false } });
	};
	const get = createBiliService(fetcher as typeof fetch), options = biliOptions('12');
	const initial = await get(options, 'session=test-only'); now += 301000; failed = true;
	const stale = await get(options, 'session=test-only'); assert.equal(stale.stale, true); assert.deepEqual(stale.items, initial.items);
	const count = calls; await get(options, 'session=test-only'); assert.equal(calls, count);
});

test('handler validates requests and serves a persistent edge snapshot without upstream access', async t => {
	const wrong = await handleBili(new Request('https://wiki.test/api/bili?uid=not-a-uid'));
	assert.equal(wrong.status, 400);
	assert.equal((await handleBili(new Request('https://wiki.test/api/bili?uid=12', { method: 'POST' }))).status, 405);
	assert.equal((await handleBili(new Request('https://wiki.test/api/bili?uid=12'), { BILI_ALLOWED_UIDS: '1933142349' })).status, 403);
	t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not fetch'); });
	const feed = { success: true, uid: '12', items: [], fetchedAt: Date.now() };
	const response = await handleBili(new Request('https://wiki.test/api/bili?uid=12&ignored=1'), {}, { cache: {
		match: async request => { assert.equal(new URL((request as Request).url).searchParams.has('ignored'), false); return Response.json(feed); },
		put: async () => {},
	} });
	assert.equal(response.status, 200); assert.deepEqual(await response.json(), feed);
});

test('a successful but empty upstream response does not erase a recent nonempty snapshot', async t => {
	let now = Date.now(); t.mock.method(Date, 'now', () => now);
	let empty = false; let calls = 0;
	const get = createBiliService((async (url: string | URL | Request) => {
		calls++;
		if (String(url).includes('/nav')) return Response.json({ code: -101, data: { wbi_img: { img_url: img, sub_url: sub } } });
		return Response.json({ code: 0, data: { items: empty ? [] : [raw('1', 100)], has_more: false } });
	}) as typeof fetch);
	const initial = await get(biliOptions('12'), 'session=test-only');
	now += 301000; empty = true;
	const next = await get(biliOptions('12'), 'session=test-only');
	assert.deepEqual(next.items, initial.items);
	assert.equal(next.stale, true);
	assert.equal(next.fetchedAt, initial.fetchedAt);
	const count = calls; await get(biliOptions('12'), 'session=test-only'); assert.equal(calls, count);
});

test('development module reloads preserve cached data without retaining the old service implementation', async t => {
	const previous = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';
	t.after(() => {
		if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous;
		Reflect.deleteProperty(globalThis, '__qustmcBiliState');
	});
	let calls = 0;
	t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => {
		calls++;
		if (String(url).includes('/nav')) return Response.json({ code: -101, data: { wbi_img: { img_url: img, sub_url: sub } } });
		return Response.json({ code: 0, data: { items: [raw('1', 100)], has_more: false } });
	});
	const source = new URL('../src/lib/bili-service.ts', import.meta.url).href;
	const before = await import(`${source}?reload=before`);
	const initial = await before.getBiliFeed(biliOptions('987654321'), 'test-cookie');
	const count = calls;
	const after = await import(`${source}?reload=after`);
	assert.notEqual(before.getBiliFeed, after.getBiliFeed);
	assert.deepEqual(await after.getBiliFeed(biliOptions('987654321'), 'test-cookie'), initial);
	assert.equal(calls, count);
});
