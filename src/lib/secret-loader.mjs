import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { relative, resolve } from 'node:path';
import { scanSecretPages } from './secret-pages.mjs';

/** Content-layer loader using file URLs, so # and % stay literal filenames. */
export function secretLoader() {
	return {
		name: 'secret-pages',
		async load(context) {
			const { config, store, parseData, generateDigest, entryTypes, watcher } = context;
			const root = fileURLToPath(new URL('./src/secretpages/', config.root));
			const renderers = new Map();
			async function sync() {
				const active = new Set();
				for (const page of await scanSecretPages(root)) {
					if (page.fileType !== 'md' && page.fileType !== 'mdx') continue;
					const id = page.relativePath;
					active.add(id);
					const contents = await readFile(page.filePath, 'utf8');
					const digest = generateDigest(contents);
					const cached = store.get(id);
					if (cached?.digest === digest) continue;
					const type = entryTypes.get(`.${page.fileType}`);
					if (!type) throw new Error(`没有可用的 ${page.fileType} 解析器：${page.filePath}`);
					const { body, data } = await type.getEntryInfo({ contents, fileUrl: pathToFileURL(page.filePath) });
					const parsed = await parseData({ id, data, filePath: page.filePath });
					const filePath = relative(fileURLToPath(config.root), page.filePath).replaceAll('\\', '/');
					if (type.getRenderFunction) {
						if (!renderers.has(type)) renderers.set(type, await type.getRenderFunction(config));
						const rendered = await renderers.get(type)({ id, data, body, filePath: page.filePath, digest });
						store.set({ id, data: parsed, body, filePath, digest, rendered, assetImports: rendered?.metadata?.imagePaths });
					} else {
						store.set({ id, data: parsed, body, filePath, digest, deferredRender: true });
					}
				}
				for (const id of store.keys()) if (!active.has(id)) store.delete(id);
			}
			await sync();
			if (watcher) {
				watcher.add(root);
				let pending = Promise.resolve();
				const update = (path) => {
					const rel = relative(root, resolve(path));
					if (rel.startsWith('..') || !/\.(md|mdx)$/.test(rel)) return;
					pending = pending.then(sync).catch((error) => context.logger.error(error.message));
				};
				watcher.on('add', update).on('change', update).on('unlink', update);
				watcher.once('close', () => {
					watcher.off('add', update).off('change', update).off('unlink', update);
				});
			}
		},
	};
}
