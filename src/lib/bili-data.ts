/** Public, normalized data shared by SSG, Workers and the browser. */
export type BiliType = 'all' | 'video' | 'image';
export interface BiliOptions { uid: string; limit: number; type: BiliType }
export interface BiliItem {
	id: string; publishedAt: number; type: string; text: string; title: string;
	images: string[]; url: string;
}
export interface BiliFeed {
	success: true; uid: string; items: BiliItem[]; fetchedAt: number; stale?: boolean;
}
export function biliOptions(uid: unknown, limit: unknown = 10, type: unknown = 'all'): BiliOptions {
	const id = String(uid ?? ''); const count = Number(limit);
	if (!/^[1-9]\d{0,19}$/.test(id)) throw new Error('uid 必须为有效的 B 站 UID');
	if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('limit 必须为 1–20 的整数');
	if (type !== 'all' && type !== 'video' && type !== 'image') throw new Error('type 必须为 all、video 或 image');
	return { uid: id, limit: count, type };
}
export function biliImage(value: unknown): string | undefined {
	if (typeof value !== 'string') return;
	try {
		const url = new URL(value.startsWith('//') ? `https:${value}` : value);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
		if (!/(^|\.)(hdslb\.com|biliimg\.com)$/.test(url.hostname)) return;
		url.protocol = 'https:';
		return `${url.origin}${url.pathname.split('@')[0]}@640w_360h_1c.webp`;
	} catch { return; }
}
/** Do not expose upstream HTML, arbitrary links, cookies or unrelated author data. */
export function normalizeBiliItems(raw: unknown[]): BiliItem[] {
	const items = new Map<string, BiliItem>();
	for (const value of raw) {
		const item = value as any;
		const id = String(item?.id_str || '');
		const publishedAt = Number(item?.modules?.module_author?.pub_ts);
		if (!/^\d+$/.test(id) || !Number.isFinite(publishedAt) || publishedAt <= 0) continue;
		const dynamic = item.modules?.module_dynamic;
		const major = dynamic?.major;
		const video = major?.archive;
		const pictures = major?.draw?.items?.map((pic: any) => pic.src) || major?.opus?.pics?.map((pic: any) => pic.url) || [];
		const images = (video?.cover ? [video.cover] : pictures).map(biliImage).filter((url: unknown): url is string => typeof url === 'string').slice(0, 9);
		items.set(id, {
			id, publishedAt, type: String(item.type || ''),
			text: String(dynamic?.desc?.text || major?.opus?.summary?.text || '').slice(0, 10000),
			title: String(video?.title || major?.opus?.title || '').slice(0, 300),
			images, url: `https://t.bilibili.com/${id}`,
		});
	}
	return [...items.values()].sort((a, b) => b.publishedAt - a.publishedAt || b.id.localeCompare(a.id));
}
export function filterBiliItems(items: BiliItem[], options: BiliOptions): BiliItem[] {
	return items.filter(item => options.type === 'all'
		|| (options.type === 'video' ? item.type === 'DYNAMIC_TYPE_AV'
			: item.type === 'DYNAMIC_TYPE_DRAW' || item.type === 'DYNAMIC_TYPE_WORD')).slice(0, options.limit);
}
