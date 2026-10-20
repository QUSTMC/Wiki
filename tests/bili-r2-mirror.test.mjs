import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorBiliSnapshots } from '../scripts/bili-r2-mirror.mjs';

const env = {
	BILI_MIRROR_SOURCE: 'http://snapshot.example/bili', BILI_ALLOWED_UIDS: '12',
	R2_ENDPOINT: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com',
	R2_BUCKET: 'bili-get', R2_ACCESS_KEY_ID: 'test-access', R2_SECRET_ACCESS_KEY: 'test-secret',
};
const feed = () => ({ success: true, uid: '12', fetchedAt: Date.now(), items: [{
	id: '123', publishedAt: 1720000000, type: 'DYNAMIC_TYPE_WORD', title: '', text: 'public text',
	images: [], url: 'https://evil.example/untrusted', cookie: 'must not propagate',
}] });

test('mirror reads the configured source then uploads sanitized public JSON without changing its timestamp', async t => {
	t.mock.method(console, 'log', () => {});
	const source = feed(); const calls = [];
	await mirrorBiliSnapshots(env, async (url, init) => {
		calls.push({ url: String(url), init });
		if (calls.length === 1) {
			assert.equal(init.headers.Authorization, undefined);
			return Response.json(source);
		}
		const uploaded = JSON.parse(init.body);
		assert.equal(uploaded.fetchedAt, source.fetchedAt);
		assert.equal(uploaded.items[0].url, 'https://t.bilibili.com/123');
		assert.equal(uploaded.items[0].cookie, undefined);
		assert.equal(init.method, 'PUT');
		assert.match(init.headers.Authorization, /^AWS4-HMAC-SHA256 /);
		return new Response('', { status: 200 });
	});
	assert.deepEqual(calls.map(call => call.url), ['http://snapshot.example/bili/12.json', `${env.R2_ENDPOINT}/bili-get/12.json`]);
});

test('mirror never writes to R2 for stale, empty, mismatched or failed source responses', async t => {
	t.mock.method(console, 'warn', () => {});
	for (const response of [
		Response.json({ ...feed(), fetchedAt: Date.now() - 1800001 }),
		Response.json({ ...feed(), items: [] }),
		Response.json({ ...feed(), uid: '99' }),
		new Response('unavailable', { status: 503 }),
	]) {
		let calls = 0;
		await assert.rejects(mirrorBiliSnapshots(env, async () => { calls++; return response; }));
		assert.equal(calls, 1);
	}
});

test('mirror fails before making requests when upload credentials are missing', async () => {
	let calls = 0;
	await assert.rejects(mirrorBiliSnapshots({ ...env, R2_SECRET_ACCESS_KEY: '' }, async () => { calls++; }), /MIRROR_CONFIG_INCOMPLETE/);
	assert.equal(calls, 0);
});
