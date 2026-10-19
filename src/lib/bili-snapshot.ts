import { biliImage, filterBiliItems, type BiliFeed, type BiliItem, type BiliOptions } from './bili-data.ts';
import { BiliUpstreamError } from './bili-service.ts';

/** Fetch only the configured snapshot origin; callers cannot choose a destination. */
export async function getBiliSnapshot(options: BiliOptions, base: string, fetcher: typeof fetch = fetch): Promise<BiliFeed> {
	const url = new URL(`${base.replace(/\/$/, '')}/${options.uid}.json`);
	if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new BiliUpstreamError('BILI_SNAPSHOT_CONFIG');
	let data: any;
	let phase = 'connect';
	let httpStatus: number | undefined;
	let cloudflareCode: string | undefined;
	try {
		const response = await fetcher(url, { signal: AbortSignal.timeout(10000), redirect: 'error', headers: { Accept: 'application/json' } });
		httpStatus = response.status;
		phase = 'read';
		const text = await response.text();
		// Cloudflare can reject a subrequest with a short "error code: 1003"
		// response. Log only its numeric identifier, never arbitrary response text.
		cloudflareCode = text.slice(0, 4096).match(/error\s*(?:code)?\s*:?\s*(1\d{3})\b/i)?.[1];
		if (!response.ok) { phase = 'http'; throw new Error(); }
		if (text.length > 1000000) throw new Error();
		phase = 'json';
		data = JSON.parse(text);
	} catch (error) {
		console.warn('[BiliDynamic] Snapshot request failed.', {
			target: url.origin + url.pathname, phase, httpStatus, cloudflareCode,
			timedOut: error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'),
		});
		throw new BiliUpstreamError('BILI_SNAPSHOT_UNAVAILABLE');
	}
	if (data?.success !== true || data.uid !== options.uid || !Array.isArray(data.items) || data.items.length > 200
		|| !Number.isFinite(data.fetchedAt) || data.fetchedAt > Date.now() + 300000) throw new BiliUpstreamError('BILI_SNAPSHOT_INVALID');
	if (Date.now() - data.fetchedAt >= 86400000) throw new BiliUpstreamError('BILI_SNAPSHOT_EXPIRED');
	const items: BiliItem[] = data.items.map((item: any) => {
		if (!item || typeof item.id !== 'string' || !/^\d+$/.test(item.id) || !Number.isFinite(item.publishedAt) || item.publishedAt <= 0
			|| typeof item.type !== 'string' || typeof item.title !== 'string' || typeof item.text !== 'string' || !Array.isArray(item.images)) throw new BiliUpstreamError('BILI_SNAPSHOT_INVALID');
		return { id: item.id, publishedAt: item.publishedAt, type: item.type, title: item.title.slice(0, 300), text: item.text.slice(0, 10000),
			images: item.images.slice(0, 9).map(biliImage).filter((image: unknown): image is string => typeof image === 'string'), url: `https://t.bilibili.com/${item.id}` };
	});
	const unique = [...new Map(items.map(item => [item.id, item])).values()].sort((a, b) => b.publishedAt - a.publishedAt || b.id.localeCompare(a.id));
	return { success: true, uid: options.uid, items: filterBiliItems(unique, options), fetchedAt: data.fetchedAt,
		...(Date.now() - data.fetchedAt > 1800000 ? { stale: true } : {}) };
}
