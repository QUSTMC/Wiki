import { createHash } from 'node:crypto';
import { normalizeBiliItems, filterBiliItems, type BiliFeed, type BiliOptions, type BiliItem } from './bili-data.ts';

const API = 'https://api.bilibili.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const MIXIN_TABLE = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,56,59,6,63,57,62,11,36,20,34,44,52];
export function wbiQuery(params: Record<string, string>, key: string, timestamp = Math.round(Date.now() / 1000)): string {
	const values = { ...params, wts: String(timestamp) };
	const query = Object.keys(values).sort().map(name => `${encodeURIComponent(name)}=${encodeURIComponent(values[name].replace(/[!'()*]/g, ''))}`).join('&');
	return `${query}&w_rid=${createHash('md5').update(query + key).digest('hex')}`;
}
export function wbiKey(image: string, sub: string): string {
	const original = [image, sub].map(url => new URL(url).pathname.split('/').at(-1)!.split('.')[0]).join('');
	if (original.length !== 64) throw new Error('BILI_WBI_KEY');
	return MIXIN_TABLE.map(index => original[index]).join('').slice(0, 32);
}
export class BiliUpstreamError extends Error {
	code: string;
	constructor(code: string) { super(code); this.code = code; }
}
type Identity = { cookie: string; key: string; expires: number };
type Snapshot = { items: BiliItem[]; fetchedAt: number };
const createState = () => ({
	identities: new Map<string, Promise<Identity>>(),
	snapshots: new Map<string, Snapshot>(),
	pending: new Map<string, Promise<Snapshot>>(),
	failures: new Map<string, number>(),
});
export function createBiliService(fetcher: typeof fetch = fetch, state = createState()) {
	// Per-isolate caches are bounded and never sent to clients.
	const { identities, snapshots, pending, failures } = state;
	async function json(url: string, cookie = '', signal?: AbortSignal, uid?: string) {
		const response = await fetcher(url, {
			headers: { 'User-Agent': USER_AGENT, Accept: 'application/json, text/plain, */*',
				Referer: uid ? `https://space.bilibili.com/${uid}/` : 'https://www.bilibili.com/',
				Origin: 'https://space.bilibili.com', ...(cookie ? { Cookie: cookie } : {}) },
			signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
		});
		if (!response.ok) throw new BiliUpstreamError(response.status === 412 ? 'BILI_RISK_CONTROL' : 'BILI_UPSTREAM_HTTP');
		let body: any;
		try { body = await response.json(); } catch { throw new BiliUpstreamError('BILI_INVALID_RESPONSE'); }
		if (body.code === -412 || body.code === -352) throw new BiliUpstreamError('BILI_RISK_CONTROL');
		return body;
	}
	async function identity(configuredCookie: string): Promise<Identity> {
		const id = createHash('sha256').update(configuredCookie).digest('hex');
		let current = identities.get(id);
		if (current && (await current).expires <= Date.now()) { identities.delete(id); current = undefined; }
		if (!current) {
			current = (async () => {
				const signal = AbortSignal.timeout(12000);
				let cookie = configuredCookie;
				if (!cookie) {
					const visitor = await json(`${API}/x/frontend/finger/spi`, '', signal);
					if (visitor.code !== 0 || !visitor.data?.b_3 || !visitor.data?.b_4) throw new BiliUpstreamError('BILI_VISITOR');
					cookie = `buvid3=${visitor.data.b_3}; buvid4=${visitor.data.b_4}`;
				}
				const nav = await json(`${API}/x/web-interface/nav`, cookie, signal);
				// Unauthenticated nav returns -101 but still provides WBI keys.
				if (!nav.data?.wbi_img?.img_url || !nav.data?.wbi_img?.sub_url) throw new BiliUpstreamError('BILI_WBI_KEY');
				return { cookie, key: wbiKey(nav.data.wbi_img.img_url, nav.data.wbi_img.sub_url), expires: Date.now() + 60 * 60 * 1000 };
			})();
			if (identities.size >= 8) identities.clear();
			identities.set(id, current);
		}
		try { return await current; } catch (error) { identities.delete(id); throw error; }
	}
	async function collect(options: BiliOptions, configuredCookie: string): Promise<Snapshot> {
		const auth = await identity(configuredCookie);
		const raw: unknown[] = []; let offset = ''; let complete = false;
		const signal = AbortSignal.timeout(18000);
		// Bound upstream work, including narrow filters and users with long histories.
		for (let page = 0; page < 3; page++) {
			const params: Record<string, string> = { host_mid: options.uid, platform: 'web', features: 'itemOpusStyle' };
			if (offset) params.offset = offset;
			const body = await json(`${API}/x/polymer/web-dynamic/v1/feed/space?${wbiQuery(params, auth.key)}`, auth.cookie, signal, options.uid);
			if (body.code !== 0 || !Array.isArray(body.data?.items)) throw new BiliUpstreamError('BILI_UPSTREAM_DATA');
			raw.push(...body.data.items);
			complete = !body.data.has_more || !body.data.offset || body.data.offset === offset;
			if (complete || filterBiliItems(normalizeBiliItems(raw), options).length >= options.limit) break;
			offset = body.data.offset;
		}
		return { items: normalizeBiliItems(raw), fetchedAt: Date.now() };
	}
	return async function getFeed(options: BiliOptions, configuredCookie = ''): Promise<BiliFeed> {
		const key = `${options.uid}:${options.type}:${options.limit}:${createHash('sha256').update(configuredCookie).digest('hex')}`;
		const old = snapshots.get(key);
		if (old && Date.now() - old.fetchedAt < (old.items.length ? 300000 : 60000)) return { success: true, uid: options.uid, items: filterBiliItems(old.items, options), fetchedAt: old.fetchedAt };
		if ((failures.get(key) || 0) > Date.now()) {
			if (old && Date.now() - old.fetchedAt < 86400000) return { success: true, uid: options.uid, items: filterBiliItems(old.items, options), fetchedAt: old.fetchedAt, stale: true };
			throw new BiliUpstreamError('BILI_RETRY_LATER');
		}
		try {
			let task = pending.get(key);
			if (!task) { task = collect(options, configuredCookie); pending.set(key, task); }
			const snapshot = await task;
			// Bilibili can return code=0 with an empty feed for a public account.
			// Treat a sudden disappearance as inconclusive while a recent snapshot exists.
			if (!snapshot.items.length && old?.items.length && Date.now() - old.fetchedAt < 86400000) {
				throw new BiliUpstreamError('BILI_EMPTY_RESPONSE');
			}
			if (!snapshot.items.length) console.warn(`[BiliDynamic] UID ${options.uid}: upstream returned a successful empty feed; public visibility or upstream filtering may be involved.`);
			if (snapshots.size >= 64) snapshots.delete(snapshots.keys().next().value!);
			snapshots.set(key, snapshot); failures.delete(key);
			return { success: true, uid: options.uid, items: filterBiliItems(snapshot.items, options), fetchedAt: snapshot.fetchedAt };
		} catch (error) {
			console.warn(`[BiliDynamic] UID ${options.uid}: ${error instanceof BiliUpstreamError ? error.code : 'BILI_UNAVAILABLE'}; ${old && Date.now() - old.fetchedAt < 86400000 ? 'retaining cached snapshot' : 'no usable snapshot'}.`);
			if (failures.size >= 64) failures.clear();
			failures.set(key, Date.now() + 60000);
			if (error instanceof BiliUpstreamError && error.code === 'BILI_RISK_CONTROL') identities.clear();
			if (old && Date.now() - old.fetchedAt < 86400000) return { success: true, uid: options.uid, items: filterBiliItems(old.items, options), fetchedAt: old.fetchedAt, stale: true };
			throw error;
		} finally { pending.delete(key); }
	};
}
// Vite may reload this module during editing. Keep its bounded caches for the
// lifetime of the dev process; production isolates retain their own module cache.
const devGlobal = globalThis as typeof globalThis & { __qustmcBiliState?: ReturnType<typeof createState> };
export const getBiliFeed = createBiliService(fetch, process.env.NODE_ENV === 'development'
	? (devGlobal.__qustmcBiliState ??= createState())
	: createState());
