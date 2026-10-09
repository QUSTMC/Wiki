import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { scanSecretPages, secretUrl, validateSecretRoutes } from './secret-pages.mjs';

test('recursive scanning, index mapping, Unicode, case, and excluded sources', async () => {
	const root = await mkdtemp(join(tmpdir(), 'secret-pages-'));
	try {
		for (const file of ['index.md', 'hello.md', 'notes/index.mdx', 'notes/private.md', '项目/2026/Road Map.html', 'custom.astro', '_draft.md', '_notes/hidden.md', '.hidden/no.md', 'notes/_draft.mdx', 'notes/.hidden.md', 'file.json']) {
			await mkdir(join(root, file, '..'), { recursive: true });
			await writeFile(join(root, file), '');
		}
		const pages = await scanSecretPages(root);
		assert.deepEqual(pages.map((page) => page.slug).sort(), ['', 'custom', 'hello', 'notes', 'notes/private', '项目/2026/Road Map'].sort());
		assert.equal(secretUrl(''), '/s/');
		assert.equal(secretUrl('项目/2026/Road Map'), '/s/%E9%A1%B9%E7%9B%AE/2026/Road%20Map/');
		assert.equal(secretUrl('A#%&'), '/s/A%23%25%26/');
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('missing source directory is valid', async () => {
	assert.deepEqual(await scanSecretPages(join(tmpdir(), `missing-secret-${crypto.randomUUID()}`)), []);
});

for (const pair of [
	[{ slug: 'hello', filePath: 'hello.md' }, { slug: 'hello', filePath: 'hello.mdx' }],
	[{ slug: 'notes', filePath: 'notes.md' }, { slug: 'notes', filePath: 'notes/index.md' }],
	[{ slug: 'café', filePath: 'a.md' }, { slug: 'cafe\u0301', filePath: 'b.md' }],
]) {
	test(`duplicate URLs rejected: ${pair.map((page) => page.filePath).join(', ')}`, () => {
		assert.throws(() => validateSecretRoutes(pair, []), (error) => pair.every((page) => error.message.includes(page.filePath)) && error.message.includes('重命名'));
	});
}

test('normal doc IDs including slug overrides collide only at the actual URL', () => {
	const pages = [{ slug: 'hello', filePath: 'src/secretpages/hello.md' }];
	validateSecretRoutes(pages, [{ id: 'hello', filePath: 'src/content/docs/hello.md' }]);
	for (const id of ['s/hello', 's/hello/index']) {
		assert.throws(() => validateSecretRoutes(pages, [{ id, filePath: 'src/content/docs/custom.md' }]), /URL 冲突：\/s\/hello\/.*\n.*secretpages\/hello.md.*\n.*docs\/custom.md/);
	}
	assert.throws(() => validateSecretRoutes([{ slug: '', filePath: 'index.md' }], [{ id: 's/index', filePath: 'docs/s/index.md' }]), /URL 冲突：\/s\//);
});
