import { mkdir, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanSecretPages, secretRouteParam } from './secret-pages.mjs';

/** Keep static hosting filenames literal despite Astro's reserved-param escaping. */
export default function secretPagesIntegration() {
	let config;
	let pending = [];
	return {
		name: 'secret-pages-output',
		hooks: {
			'astro:config:done': ({ config: resolved }) => { config = resolved; },
			// Keep raw HTML/Astro out of Starlight's search scan without editing their bytes.
			'astro:build:generated': async ({ dir }) => {
				pending = [];
				const root = fileURLToPath(new URL('./src/secretpages/', config.root));
				const output = fileURLToPath(dir);
				for (const page of await scanSecretPages(root)) {
					const param = secretRouteParam(page.slug).replaceAll('#', '%23').replaceAll('?', '%3F');
					const suffix = config.build.format === 'file' ? '.html' : '/index.html';
					const source = resolve(output, `s/${param}${suffix}`);
					const target = resolve(output, `s/${page.slug.normalize()}${suffix}`);
					const temporary = fileURLToPath(new URL(`secret-output/${pending.length}.html`, config.cacheDir));
					await mkdir(dirname(temporary), { recursive: true });
					await rename(source, temporary);
					pending.push({ temporary, target });
				}
			},
			'astro:build:done': async () => {
				for (const { temporary, target } of pending) {
					await mkdir(dirname(target), { recursive: true });
					await rename(temporary, target);
				}
				pending = [];
			},
		},
	};
}
