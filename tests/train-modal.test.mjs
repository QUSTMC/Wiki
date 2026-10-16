import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

// Run after `astro build`, setting PLAYWRIGHT_MODULE to an installed Playwright
// module URL. Exercise production CSS layers rather than Vite's dev styles.
test('advanced query modal stays centered in the production build', {
	skip: !process.env.PLAYWRIGHT_MODULE,
}, async t => {
	const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
	const root = resolve('dist');
	const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
	const server = createServer(async (req, res) => {
		try {
			const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
			const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
			if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
			res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
			res.end(await readFile(file));
		} catch { res.writeHead(404).end(); }
	});
	await new Promise(done => server.listen(0, '127.0.0.1', done));
	t.after(() => { server.closeAllConnections(); server.close(); });
	const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
	t.after(() => browser.close());
	const page = await browser.newPage({ reducedMotion: 'reduce' });
	await page.route('https://train.lista233.cn/**', route => route.fulfill({ json: { success: true, boards: {}, names: [], total: 0 } }));
	await page.goto(`http://127.0.0.1:${server.address().port}/train/`);
	for (const theme of ['light', 'dark']) {
		await page.locator('starlight-theme-select select').first().selectOption(theme, { force: true });
		for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 700 }, { width: 320, height: 480 }]) {
			await page.setViewportSize(viewport);
			await page.locator('[data-advanced-open]').click();
			const dialog = page.locator('#train-advanced');
			const rect = await dialog.boundingBox();
			assert.ok(rect, 'dialog must be visible');
			assert.ok(Math.abs(rect.x + rect.width / 2 - viewport.width / 2) < 2, `horizontal centering: ${theme} ${JSON.stringify(rect)}`);
			assert.ok(Math.abs(rect.y + rect.height / 2 - viewport.height / 2) < 2, `vertical centering: ${theme} ${JSON.stringify(rect)}`);
			assert.ok(rect.width <= viewport.width && rect.height <= viewport.height, 'dialog must fit viewport');
			assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
			await dialog.getByRole('button', { name: '取消', exact: true }).click();
			await dialog.waitFor({ state: 'hidden' });
		}
	}
});
