import test from 'node:test';
import assert from 'node:assert/strict';
import { r2Request, uploadBiliR2 } from '../scripts/bili-r2.mjs';

const env = { R2_ENDPOINT: 'https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com', R2_BUCKET: 'bili-get', R2_ACCESS_KEY_ID: 'test-access', R2_SECRET_ACCESS_KEY: 'test-secret' };
test('R2 upload signs the JSON payload with auto region and sends it only to the configured bucket', async t => {
	t.mock.method(console, 'log', () => {});
	const content = '{"success":true}\n';
	const request = r2Request('12', content, env, new Date('2026-10-20T00:00:00Z'));
	assert.equal(request.url.pathname, '/bili-get/12.json');
	assert.match(request.init.headers.Authorization, /Credential=test-access\/20261020\/auto\/s3\/aws4_request/);
	assert.match(request.init.headers.Authorization, /Signature=[a-f0-9]{64}$/);
	assert.equal(request.init.headers['x-amz-date'], '20261020T000000Z');
	assert.notEqual(request.init.headers.Authorization, r2Request('12', '{}', env, new Date('2026-10-20T00:00:00Z')).init.headers.Authorization);
	assert.ok(!JSON.stringify(request.init).includes(env.R2_SECRET_ACCESS_KEY));
	assert.equal(await uploadBiliR2('12', content, env, async (url, init) => {
		assert.equal(url.href, `${env.R2_ENDPOINT}/bili-get/12.json`);
		assert.equal(init.body, content); assert.equal(init.method, 'PUT'); assert.equal(init.redirect, 'error');
		assert.equal(init.headers['cache-control'], 'public, max-age=60');
		return new Response('', { status: 200 });
	}), true);
});

test('missing secret skips upload, credentials cannot be sent to arbitrary hosts, failures have safe errors', async t => {
	t.mock.method(console, 'warn', () => {});
	let calls = 0;
	assert.equal(await uploadBiliR2('12', '{}', { ...env, R2_SECRET_ACCESS_KEY: '' }, async () => { calls++; }), false);
	assert.equal(calls, 0);
	assert.throws(() => r2Request('12', '{}', { ...env, R2_ENDPOINT: 'https://evil.test' }), /INVALID_ENDPOINT/);
	await assert.rejects(uploadBiliR2('12', '{}', env, async () => new Response('secret upstream error', { status: 403 })), /^Error: R2_UPLOAD_HTTP_403$/);
	await assert.rejects(uploadBiliR2('12', '{}', env, async () => { throw new Error('contains secret'); }), /^Error: R2_UPLOAD_NETWORK$/);
});
