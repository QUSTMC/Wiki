import { createHash, createHmac } from 'node:crypto';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/** SigV4 for a single public JSON object; credentials never leave the S3 request. */
export function r2Request(uid, content, env, now = new Date()) {
	if (!/^[1-9]\d{0,19}$/.test(uid)) throw new Error('R2_INVALID_UID');
	const endpoint = new URL(env.R2_ENDPOINT);
	if (endpoint.protocol !== 'https:' || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname)
		|| endpoint.port || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/') throw new Error('R2_INVALID_ENDPOINT');
	if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.R2_BUCKET || '') || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) throw new Error('R2_CONFIG_INCOMPLETE');
	const url = new URL(`/${encode(env.R2_BUCKET)}/${uid}.json`, endpoint);
	const date = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
	const scope = `${date.slice(0, 8)}/auto/s3/aws4_request`;
	const headers = {
		'cache-control': 'public, max-age=60',
		'content-type': 'application/json; charset=utf-8',
		host: url.host,
		'x-amz-content-sha256': sha256(content),
		'x-amz-date': date,
	};
	const names = Object.keys(headers).sort();
	const canonical = ['PUT', url.pathname, '', names.map(name => `${name}:${headers[name]}\n`).join(''), names.join(';'), headers['x-amz-content-sha256']].join('\n');
	const signingKey = hmac(hmac(hmac(hmac(`AWS4${env.R2_SECRET_ACCESS_KEY}`, date.slice(0, 8)), 'auto'), 's3'), 'aws4_request');
	const signature = createHmac('sha256', signingKey).update(`AWS4-HMAC-SHA256\n${date}\n${scope}\n${sha256(canonical)}`).digest('hex');
	delete headers.host; // fetch supplies Host from the URL.
	return { url, init: { method: 'PUT', headers: { ...headers, Authorization: `AWS4-HMAC-SHA256 Credential=${env.R2_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${signature}` }, body: content, redirect: 'error', signal: AbortSignal.timeout(20000) } };
}

export async function uploadBiliR2(uid, content, env = process.env, fetcher = fetch) {
	if (!env.R2_ENDPOINT) return false;
	// An empty secret lets operators finish setup without stopping local collection.
	if (!env.R2_SECRET_ACCESS_KEY) { console.warn('[BiliR2] Secret not configured; local snapshot saved, upload skipped.'); return false; }
	const request = r2Request(uid, content, env);
	let response;
	try { response = await fetcher(request.url, request.init); } catch (error) {
		const candidate = error?.cause?.code;
		const code = typeof candidate === 'string' && /^[A-Z_0-9]{1,60}$/.test(candidate) ? candidate : undefined;
		console.warn('[BiliR2] Upload connection failed.', { code, timedOut: error?.name === 'TimeoutError' || error?.name === 'AbortError' });
		throw new Error('R2_UPLOAD_NETWORK');
	}
	if (!response.ok) throw new Error(`R2_UPLOAD_HTTP_${response.status}`);
	console.log(`[BiliR2] UID ${uid}: uploaded public JSON.`);
	return true;
}
