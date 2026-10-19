import { biliImage, type BiliItem } from './bili-data.ts';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function renderBiliList(items: BiliItem[], empty = '暂无公开动态。'): string {
	if (!items.length) return `<p class="bili-empty">${escape(empty)}</p>`;
	return items.map(item => {
		if (!/^\d+$/.test(item.id) || !Number.isFinite(item.publishedAt)) return '';
		const url = `https://t.bilibili.com/${item.id}`;
		const date = new Date(item.publishedAt * 1000);
		const label = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
		const kind = item.type === 'DYNAMIC_TYPE_AV' ? '视频' : item.type === 'DYNAMIC_TYPE_FORWARD' ? '转发' : '动态';
		const images = item.images.map(biliImage).filter((value): value is string => Boolean(value));
		return `<article class="ore-card bili-item" data-dynamic-id="${item.id}"><div class="ore-card-body"><div class="ore-card-caption bili-caption">
			<div class="bili-meta"><span>${kind}</span><time datetime="${date.toISOString()}">${label}</time></div>
			${item.title ? `<h3 class="bili-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${escape(item.title)}</a></h3>` : ''}
			${item.text ? `<p class="bili-text">${escape(item.text)}</p>` : ''}
			${images.length ? `<div class="bili-images" data-count="${images.length}">${images.map((image, index) => `<a href="${url}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><img src="${escape(image)}" alt="${escape(item.title || `动态配图 ${index + 1}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="640" height="360" /></a>`).join('')}</div>` : ''}
			<a class="bili-detail" href="${url}" target="_blank" rel="noopener noreferrer">在 B 站查看 ↗</a>
		</div></div></article>`;
	}).join('');
}
