import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { promisify } from 'node:util';
import { getBiliSnapshot } from '../src/lib/bili-snapshot.ts';
import { biliOptions } from '../src/lib/bili-data.ts';
import { handleBili } from '../src/lib/bili-handler.ts';

const item = { id: '123', publishedAt: 1700000000, type: 'DYNAMIC_TYPE_AV', title: '视频', text: '介绍', images: ['https://evil.test/p.jpg'], url: 'javascript:bad()' };
const snapshot = () => ({ success: true, uid: '12', items: [item], fetchedAt: Date.now() });

test('snapshot reader filters and sanitizes public data, rejects invalid or expired snapshots', async () => {
	const options = biliOptions('12');
	const read = (data: unknown) => getBiliSnapshot(options, 'https://snapshot.test/bili', (async url => {
		assert.equal(String(url), 'https://snapshot.test/bili/12.json'); return Response.json(data);
	}) as typeof fetch);
	const feed = await read(snapshot());
	assert.equal(feed.items[0].url, 'https://t.bilibili.com/123'); assert.deepEqual(feed.items[0].images, []);
	assert.equal((await read({ ...snapshot(), fetchedAt: Date.now() - 1900000 })).stale, true);
	await assert.rejects(read({ ...snapshot(), fetchedAt: Date.now() - 86400001 }), /BILI_SNAPSHOT_EXPIRED/);
	await assert.rejects(read({ ...snapshot(), uid: '13' }), /BILI_SNAPSHOT_INVALID/);
	await assert.rejects(read({ ...snapshot(), items: [{}] }), /BILI_SNAPSHOT_INVALID/);
	await assert.rejects(getBiliSnapshot(options, 'ftp://snapshot.test/bili'), /BILI_SNAPSHOT_CONFIG/);
	assert.equal((await getBiliSnapshot(options, 'http://47.105.123.24:20003/bili', (async (_url, init) => {
		assert.equal(new Headers(init?.headers).has('Cookie'), false);
		return Response.json(snapshot());
	}) as typeof fetch)).items.length, 1);
});

test('Worker snapshot mode only calls the configured source, never Bilibili or sends its Cookie', async t => {
	t.mock.method(globalThis, 'fetch', async (url: URL, init: RequestInit) => {
		assert.equal(String(url), 'https://snapshot.test/bili/12.json');
		assert.equal(new Headers(init.headers).has('Cookie'), false);
		return Response.json(snapshot());
	});
	const response = await handleBili(new Request('https://wiki.test/api/bili?uid=12'), { BILI_SNAPSHOT_BASE: 'https://snapshot.test/bili', BILI_COOKIE: 'secret' });
	assert.equal(response.status, 200); assert.equal((await response.json()).items.length, 1);
});

test('server collector writes real normalized JSON atomically and retains it on empty or rejected fetches', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'bili-sync-'));
	t.after(() => rm(directory, { recursive: true, force: true }));
	const run = async (mode: string) => {
		const preload = `globalThis.fetch=async(url)=>{
			if(${JSON.stringify(mode)}==='failed')return new Response('',{status:412});
			if(String(url).includes('/nav'))return Response.json({code:0,data:{wbi_img:{img_url:'https://i0.hdslb.com/7cd084941338484aae1ad9425b84077c.png',sub_url:'https://i0.hdslb.com/4932caff0ff746eab6f01bf08b70ac45.png'}}});
			return Response.json({code:0,data:{has_more:false,items:${mode === 'empty' ? '[]' : '[{id_str:"123",type:"DYNAMIC_TYPE_AV",modules:{module_author:{pub_ts:1700000000},module_dynamic:{desc:{text:"test"}}}}]'}}});
		};`;
		return promisify(execFile)(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, 'scripts/bili-sync.mjs'], {
			env: { ...process.env, BILI_SNAPSHOT_DIR: directory, BILI_ALLOWED_UIDS: '12', BILI_COOKIE: 'secret-test-cookie' },
		});
	};
	await run('success');
	const target = join(directory, '12.json'), initial = await readFile(target, 'utf8');
	assert.equal(JSON.parse(initial).items[0].id, '123'); assert.ok(!initial.includes('secret-test-cookie'));
	for (const mode of ['empty', 'failed']) {
		await assert.rejects(run(mode));
		assert.equal(await readFile(target, 'utf8'), initial);
	}
	assert.deepEqual(await readdir(directory), ['12.json']);
});

test('standalone HTTP server exposes only numeric public snapshots and supports HEAD', async t => {
	const directory = await mkdtemp(join(tmpdir(), 'bili-http-'));
	const { writeFile } = await import('node:fs/promises');
	await writeFile(join(directory, '12.json'), JSON.stringify(snapshot()));
	await writeFile(join(directory, 'private.env'), 'SECRET=must-not-be-served');
	const reservation = createServer();
	await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
	const port = (reservation.address() as { port: number }).port;
	await new Promise<void>(resolve => reservation.close(() => resolve()));
	const child = spawn(process.execPath, ['scripts/bili-http.mjs'], { env: { ...process.env, BILI_HTTP_PORT: String(port), BILI_SNAPSHOT_DIR: directory }, stdio: ['ignore', 'pipe', 'pipe'] });
	t.after(async () => {
		if (child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('exit', resolve)); }
		await rm(directory, { recursive: true, force: true });
	});
	await new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => reject(new Error('server startup timeout')), 10000);
		child.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
		child.once('error', reject);
	});
	const origin = `http://127.0.0.1:${port}`;
	assert.equal((await (await fetch(`${origin}/bili/12.json`)).json()).uid, '12');
	const head = await fetch(`${origin}/bili/12.json`, { method: 'HEAD' });
	assert.equal(head.status, 200); assert.equal(await head.text(), '');
	assert.equal((await fetch(`${origin}/bili/12.json`, { method: 'POST' })).status, 405);
	for (const path of ['/bili/private.env', '/bili/../private.env', '/bili/', '/bili/12.json/extra', '/etc/qust-bili.env']) {
		const response = await fetch(`${origin}${path}`);
		assert.equal(response.status, 404); assert.ok(!(await response.text()).includes('SECRET'));
	}
});
