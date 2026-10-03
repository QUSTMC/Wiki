import type { ImageMetadata } from 'astro';

export interface ComicImage {
	name: string;
	src: ImageMetadata;
}

export interface ComicAlbum {
	folder: string;
	images: ComicImage[];
}

const files = import.meta.glob<{ default: ImageMetadata }>(
	'/src/assets/comic/**/*.{jpg,jpeg,png,gif,webp,avif,JPG,JPEG,PNG,GIF,WEBP,AVIF}',
	{ eager: true },
);
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });
const groups = new Map<string, ComicImage[]>();

for (const [path, image] of Object.entries(files)) {
	const [folder, ...parts] = path.slice('/src/assets/comic/'.length).split('/');
	if (!folder || parts.length === 0) continue;
	const images = groups.get(folder) ?? [];
	images.push({ name: parts.join('/'), src: image.default });
	groups.set(folder, images);
}

export const comicAlbums: ComicAlbum[] = Array.from(groups, ([folder, images]) => ({
	folder,
	images: images.sort((a, b) => collator.compare(a.name, b.name) || a.name.localeCompare(b.name)),
})).sort((a, b) => collator.compare(a.folder, b.folder) || a.folder.localeCompare(b.folder));

export function comicUrl(folder?: string) {
	return `${import.meta.env.BASE_URL.replace(/\/$/, '')}/comic/${folder ? `${encodeURIComponent(folder)}/` : ''}`;
}
