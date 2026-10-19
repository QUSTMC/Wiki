import test from 'node:test';
import assert from 'node:assert/strict';

// Run against a built site served by `wrangler dev --local` (or Astro dev).
test('Bili static fallback and silent refresh preserve stable DOM and handle changes', {
	skip: !process.env.PLAYWRIGHT_MODULE,
}, async t => {
	const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
	const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
	t.after(() => browser.close());
	const origin = process.env.BILI_TEST_ORIGIN || 'http://127.0.0.1:8787';
	const staticPage = await browser.newPage({ javaScriptEnabled: false });
	await staticPage.goto(origin, { waitUntil: 'domcontentloaded' });
	assert.equal(await staticPage.locator('[data-bili-dynamic]').count(), 1);
	assert.match(await staticPage.locator('.bili-heading a').getAttribute('href'), /1933142349/);
	assert.ok((await staticPage.locator('[data-bili-list]').innerHTML()).length > 0);
	await staticPage.close();
	for (const mode of ['same', 'changed', 'failed', 'empty']) {
		const page = await browser.newPage();
		const errors = []; page.on('pageerror', error => errors.push(error.message));
		let release;
		const gate = new Promise(resolve => { release = resolve; });
		let arrived;
		const requested = new Promise(resolve => { arrived = resolve; });
		let original;
		await page.route('**/api/bili?**', async route => {
			arrived(); await gate;
			if (mode === 'failed') return route.fulfill({ status: 503, json: { success: false } });
			return route.fulfill({ json: { success: true, items: mode === 'empty' ? [] : mode === 'same' ? original : [{
				id: '123456789012345', publishedAt: 1792400000, type: 'DYNAMIC_TYPE_AV', title: '测试视频',
				text: '<script>unsafe()</script> 测试动态', images: [], url: 'javascript:unsafe()',
			}], fetchedAt: Date.now() } });
		});
		await page.goto(origin, { waitUntil: 'domcontentloaded' }); await requested;
		original = JSON.parse(await page.locator('[data-bili-dynamic]').getAttribute('data-items'));
		if (mode === 'empty') await page.evaluate(() => {
			const root = document.querySelector('[data-bili-dynamic]');
			root.dataset.items = JSON.stringify([{ id: '123456789012345' }]);
			root.querySelector('[data-bili-list]').innerHTML = '<p>已有动态，应在空响应后保留</p>';
		});
		const oldHTML = await page.locator('[data-bili-list]').innerHTML();
		await page.evaluate(() => {
			window.biliChanges = 0;
			new MutationObserver(records => { window.biliChanges += records.length; }).observe(document.querySelector('[data-bili-list]'), { childList: true, subtree: true, attributes: true, characterData: true });
		});
		release();
		if (mode === 'changed') {
			await page.locator('[data-dynamic-id="123456789012345"]').waitFor();
			assert.equal(await page.locator('[data-bili-list] script').count(), 0);
			assert.equal(await page.locator('.bili-detail').getAttribute('href'), 'https://t.bilibili.com/123456789012345');
			for (const theme of ['light', 'dark']) {
				await page.locator('starlight-theme-select select').first().selectOption(theme, { force: true });
				for (const width of [320, 390, 1280]) {
					await page.setViewportSize({ width, height: 900 });
					assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
				}
			}
		} else {
			await page.waitForTimeout(350);
			assert.equal(await page.locator('[data-bili-list]').innerHTML(), oldHTML);
			assert.equal(await page.evaluate(() => window.biliChanges), 0);
		}
		assert.deepEqual(errors, []); await page.close();
	}
});
