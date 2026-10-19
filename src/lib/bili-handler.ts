import { biliOptions, type BiliFeed } from './bili-data.ts';
import { getBiliFeed, BiliUpstreamError } from './bili-service.ts';

export interface BiliEnv { BILI_COOKIE?: string; BILI_ALLOWED_UIDS?: string }
interface Runtime { cache?: Pick<Cache, 'match' | 'put'>; waitUntil?: (task: Promise<unknown>) => void }
const output = (data: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(data, {
	status, headers: { 'Cache-Control': status === 200 ? 'public, max-age=60' : 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
});

export async function handleBili(request: Request, env: BiliEnv = {}, runtime: Runtime = {}): Promise<Response> {
	if (request.method !== 'GET') return output({ success: false, error: 'METHOD_NOT_ALLOWED' }, 405, { Allow: 'GET' });
	const url = new URL(request.url);
	let options;
	try { options = biliOptions(url.searchParams.get('uid'), url.searchParams.get('limit') ?? 10, url.searchParams.get('type') ?? 'all'); }
	catch { return output({ success: false, error: 'INVALID_PARAMETERS' }, 400); }
	if (env.BILI_ALLOWED_UIDS && !env.BILI_ALLOWED_UIDS.split(',').map(uid => uid.trim()).includes(options.uid)) {
		return output({ success: false, error: 'UID_NOT_ENABLED' }, 403);
	}
	// A normalized internal cache key prevents arbitrary query strings from bypassing caching.
	const cacheKey = new Request(`${url.origin}/api/bili?uid=${options.uid}&limit=${options.limit}&type=${options.type}`);
	let cached: BiliFeed | undefined;
	try {
		const hit = await runtime.cache?.match(cacheKey);
		if (hit) cached = await hit.json() as BiliFeed;
	} catch { /* Cache availability must not prevent fetching the feed. */ }
	if (cached && Date.now() - cached.fetchedAt < (cached.items.length ? 300000 : 60000)) return output(cached);
	try {
		const feed = await getBiliFeed(options, env.BILI_COOKIE);
		if (!feed.items.length && cached?.items.length && Date.now() - cached.fetchedAt < 86400000) {
			console.warn(`[BiliDynamic] UID ${options.uid}: empty upstream feed; retaining edge snapshot.`);
			return output({ ...cached, stale: true });
		}
		if (feed.stale && cached && cached.fetchedAt > feed.fetchedAt) return output({ ...cached, stale: true });
		if (!feed.stale && runtime.cache) {
			// Keep the last successful snapshot for a day, revalidate after five minutes.
			const task = runtime.cache.put(cacheKey, output(feed, 200, { 'Cache-Control': 'public, max-age=86400' })).catch(() => {});
			if (runtime.waitUntil) runtime.waitUntil(task); else await task;
		}
		return output(feed);
	} catch (error) {
		if (cached && Date.now() - cached.fetchedAt < 86400000) return output({ ...cached, stale: true });
		// Never return upstream pages, credentials or request headers.
		return output({ success: false, error: error instanceof BiliUpstreamError ? error.code : 'BILI_UNAVAILABLE' }, 503, { 'Retry-After': '60' });
	}
}
