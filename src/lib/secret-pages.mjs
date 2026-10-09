import { readdir } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const supportedTypes = new Set(['md', 'mdx', 'html', 'astro']);

/** Encode each segment separately, preserving nesting and case. */
export function encodeSlug(slug) {
	return slug.normalize().split('/').map(encodeURIComponent).join('/');
}

export function stripIndex(slug) {
	return slug === 'index' ? '' : slug.replace(/\/index$/, '');
}

export function secretUrl(slug) {
	return `/s/${slug ? `${encodeSlug(slug)}/` : ''}`;
}

// Astro 7 matches decoded params, but leaves reserved URI characters encoded.
// A literal percent forces its fallback decoder, which retains all other escapes.
export function secretRouteParam(slug) {
	return slug.includes('%') ? encodeSlug(slug).replaceAll('%25', '%') : slug.normalize();
}

/** Scan only real files: hidden/draft directories and symbolic links are skipped. */
export async function scanSecretPages(root) {
	const pages = [];
	async function visit(directory, prefix = '') {
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error.code === 'ENOENT' && directory === root) return;
			throw error;
		}
		entries.sort((a, b) => a.name.localeCompare(b.name));
		for (const entry of entries) {
			if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
			const relativePath = `${prefix}${entry.name}`;
			const filePath = resolve(directory, entry.name);
			if (entry.isDirectory()) {
				await visit(filePath, `${relativePath}/`);
			} else if (entry.isFile()) {
				const extension = extname(entry.name);
				const fileType = extension.slice(1);
				if (!supportedTypes.has(fileType)) continue;
				pages.push({ filePath, relativePath, fileType, slug: stripIndex(relativePath.slice(0, -extension.length)) });
			}
		}
	}
	await visit(root);
	return pages;
}

/** Docs IDs come from Starlight's loader, including frontmatter slug overrides. */
export function validateSecretRoutes(pages, docs) {
	const docUrls = new Map(docs.map((doc) => [
		`/${encodeSlug(stripIndex(doc.id.replace(/^\/+|\/+$/g, '')))}/`.replace(/^\/\/$/, '/'),
		doc.filePath ?? `src/content/docs/${doc.id}`,
	]));
	const seen = new Map();
	for (const page of pages) {
		const url = secretUrl(page.slug);
		const duplicate = seen.get(url);
		const normal = docUrls.get(url);
		if (duplicate || normal) {
			throw new Error(`检测到 URL 冲突：${url}\n  - Secret 文件：${page.filePath}\n  - ${duplicate ? 'Secret 文件' : '正常文件'}：${duplicate ?? normal}\n请重命名 Secret 文件或移动其中一个文件以解决冲突。`);
		}
		seen.set(url, page.filePath);
	}
}
