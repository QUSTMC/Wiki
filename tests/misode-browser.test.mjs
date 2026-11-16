import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test('Misode integration keeps navigation, deep links and resources under its prefix', {
  skip: !process.env.PLAYWRIGHT_MODULE,
  timeout: 120000,
}, async t => {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  const root = resolve('dist');
  const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.ttf':'font/ttf', '.woff2':'font/woff2' };
  const server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (!extname(pathname) && !pathname.endsWith('/')) {
        res.writeHead(301, { Location: pathname + '/' }).end(); return;
      }
      if (pathname.endsWith('/')) pathname += 'index.html';
      const file = resolve(root, '.' + pathname);
      if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
  // Register evidence collection before the browser-close teardown hook.
  t.after(async () => {
    if (t.passed || page.isClosed()) return;
    const directory = resolve('test-results/misode');
    await mkdir(directory, { recursive: true });
    await Promise.allSettled([
      page.screenshot({ path: resolve(directory, 'failure.png'), fullPage: true }),
      page.content().then(html => writeFile(resolve(directory, 'failure.html'), html)),
      page.evaluate(() => ({
        url: location.href, width: innerWidth, clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth, fonts: document.fonts.status,
        cards: [...document.querySelectorAll('a.card')].map(element => ({
          text: element.textContent, rect: element.getBoundingClientRect().toJSON(),
          parent: element.parentElement?.getBoundingClientRect().toJSON(),
        })),
      })).then(data => writeFile(resolve(directory, 'layout.json'), JSON.stringify(data, null, 2))),
    ]);
  });
  t.after(() => browser.close());
  const errors = [], missing = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin + '/misode/') && response.status() >= 400) missing.push(response.url());
  });
  // External data endpoints remain live; do not mock generator schemas or registries.
  await page.goto(origin + '/');
  await page.getByRole('link', { name: '更多功能', exact: true }).first().click();
  await page.waitForURL('**/tools/');
  assert.equal(await page.locator('a[href="/train/"]').count(), 1);
  await page.locator('a[href="/misode/"]').click();
  await page.waitForURL('**/misode/');
  await page.locator('header a[href="/misode/"]').waitFor();
  const attribution = page.locator('[data-qust-translation-notice]');
  await attribution.waitFor();
  assert.match(await attribution.innerText(), /本地 AI/);
  assert.match(await attribution.innerText(), /可能存在错误/);
  assert.equal(await attribution.locator('a').getAttribute('href'),'https://github.com/CFPAOrg/Glossary');

  await page.locator('header .btn[aria-label="语言"]').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('language')), 'zh-cn');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-cn');
  await page.locator('a[href="/misode/convert/"] h3').filter({hasText:/转换/}).waitFor();
  // An explicit choice survives reload rather than being reset to Chinese on every visit.
  await page.locator('header .btn[aria-label="语言"]').click();
  await page.locator('header .btn-group .btn').filter({ hasText: /^English$/ }).click();
  await page.reload();
  await page.locator('header .btn[aria-label="Language"]').waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('language')), 'en');
  await page.locator('a[href="/misode/convert/"] h3').filter({hasText:/^Converter/}).waitFor();
  await page.locator('header .btn[aria-label="Language"]').click();
  await page.locator('header .btn-group .btn').filter({ hasText: /^简体中文$/ }).click();
  await page.locator('header .btn[aria-label="语言"]').waitFor();

  assert.equal(await page.locator('link[data-qust-oreui]').count(), 1);
  const icons = await page.locator('header nav .btn-menu > .btn').evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    const svg = button.querySelector('svg').getBoundingClientRect();
    return {
      top: rect.top,
      dx: svg.x + svg.width / 2 - (rect.x + rect.width / 2),
      // The raised button face ends 4px above its bottom shadow.
      dy: svg.y + svg.height / 2 - (rect.y + (rect.height - 4) / 2),
    };
  }));
  assert.equal(icons.length, 2);
  assert.equal(icons[0].top, icons[1].top);
  for (const icon of icons) {
    assert.ok(Math.abs(icon.dx) < 0.5 && Math.abs(icon.dy) < 0.5, 'header icons must be centered on the raised button face');
  }

  for (const theme of ['light', 'dark']) {
    await page.locator('header .btn[aria-label="主题"]').click();
    await page.locator('header .btn-group .btn').filter({ hasText: theme === 'light' ? /^明亮$/ : /^暗黑$/ }).click();
    await page.waitForFunction(expected => document.documentElement.classList.contains('dark') === (expected === 'dark'), theme);
    const styles = await page.locator('a.card').first().evaluate(card => ({
      radius: getComputedStyle(card).borderRadius,
      border: getComputedStyle(card).borderTopWidth,
      body: getComputedStyle(document.body).backgroundColor,
      font: getComputedStyle(document.body).fontFamily,
    }));
    assert.equal(styles.radius, '0px');
    assert.equal(styles.border, '2px');
    assert.equal(styles.body, theme === 'light' ? 'rgb(244, 246, 249)' : 'rgb(36, 36, 37)');
    assert.match(styles.font, /QUST Fusion Pixel/);
  }

  await page.locator('a[href="/misode/loot-table/"]').first().waitFor();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    // setViewportSize acknowledges the viewport change, not every responsive
    // component/font reflow. Poll geometry instead of asserting a transient frame.
    try {
      await page.waitForFunction(expectedWidth => {
        if (innerWidth !== expectedWidth || document.fonts.status !== 'loaded') return false;
        const cards = [...document.querySelectorAll('a.card')];
        const back = document.querySelector('header a[data-native]')?.getBoundingClientRect();
        return cards.length > 0 && cards.every(element => {
          const r = element.getBoundingClientRect();
          return r.width > 0 && r.left >= -0.5 && r.right <= expectedWidth + 0.5;
        }) && back && back.top >= -0.5 && back.bottom <= 56.5;
      }, width, { timeout: 10000, polling: 'raf' });
    } catch (cause) {
      const geometry = await page.evaluate(() => ({
        viewport: innerWidth, fonts: document.fonts.status,
        cards: [...document.querySelectorAll('a.card')].map(e => e.getBoundingClientRect().toJSON()),
        back: document.querySelector('header a[data-native]')?.getBoundingClientRect().toJSON(),
      }));
      assert.fail(`Mobile layout did not fit ${width}px after responsive reflow: ${JSON.stringify(geometry)}; ${cause.message}`);
    }
    const card = await page.locator('a.card').first().boundingBox();
    const back = await page.locator('header a[data-native]').boundingBox();
    assert.ok(card && card.x >= -0.5 && card.x + card.width <= width + 0.5, `mobile card must not be clipped: ${JSON.stringify({ width, card })}`);
    assert.ok(back && back.y >= -0.5 && back.y + back.height <= 56.5, `return link must fit header: ${JSON.stringify(back)}`);
  }
  // A long unbroken control label models the wider min-content width seen
  // with Linux fallback fonts/upstream version labels. The outer grid must
  // retain both 16px gutters instead of expanding its whole card track.
  const intrinsicProbe = await page.locator('.navigation').first().evaluateHandle(navigation => {
    const element = document.createElement('span');
    element.dataset.qustIntrinsicProbe = '';
    element.textContent = 'minecraft:long_unbroken_upstream_version_identifier';
    element.style.cssText = 'display:block;white-space:nowrap;font:18px monospace';
    navigation.append(element);
    return element;
  });
  // Cover asynchronously inserted nested cards without depending on the timing
  // or language of the external news feed in a particular CI run.
  const nestedProbe = await page.locator('.tool-body').first().evaluateHandle(body => {
    const card = document.createElement('a');
    card.className = 'card';
    card.dataset.qustNestedProbe = '';
    const content = document.createElement('div');
    content.className = 'card-content';
    content.textContent = 'MinecraftLongUnbrokenNewsTitle_'.repeat(12);
    card.append(content);
    body.append(card);
    return card;
  });
  try {
    try {
      await page.waitForFunction(() => {
        const primary = document.querySelectorAll('.qust-translation-notice + .grid > :first-child .card-grid > a.card');
        const all = document.querySelectorAll('a.card');
        return primary.length > 0 && [...primary].every(element => {
          const r = element.getBoundingClientRect();
          return r.left >= 15.5 && r.right <= innerWidth - 15.5;
        }) && [...all].every(element => {
          const r = element.getBoundingClientRect();
          const parent = element.parentElement.getBoundingClientRect();
          return r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.left >= parent.left - 0.5 && r.right <= parent.right + 0.5;
        });
      }, null, { timeout: 5000 });
    } catch (cause) {
      const geometry = await page.locator('a.card').evaluateAll(cards => cards.map(element => ({
        text: element.textContent?.slice(0, 160),
        rect: element.getBoundingClientRect().toJSON(),
        parent: { class: element.parentElement.className, rect: element.parentElement.getBoundingClientRect().toJSON() },
        primary: element.matches('.qust-translation-notice + .grid > :first-child .card-grid > a.card'),
      })));
      assert.fail(`Intrinsic-width stress layout failed at ${await page.evaluate(() => innerWidth)}px: ${JSON.stringify(geometry)}; ${cause.message}`);
    }
    const container = await page.locator('.qust-translation-notice + .grid').evaluate(element => ({
      rect: element.getBoundingClientRect().toJSON(),
      child: element.firstElementChild.getBoundingClientRect().toJSON(),
    }));
    assert.ok(container.child.width <= 288.5, `homepage content must fit 320px minus gutters: ${JSON.stringify(container)}`);
  } finally {
    await nestedProbe.evaluate(element => element.remove());
    await nestedProbe.dispose();
    await intrinsicProbe.evaluate(element => element.remove());
    await intrinsicProbe.dispose();
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  const escaped = await page.locator('a[href^="/"]').evaluateAll(links => links.map(a => a.getAttribute('href')).filter(href => !href.startsWith('/misode/') && href !== '/tools/'));
  assert.deepEqual(escaped, [], 'internal links must stay in the app');
  await page.locator('a[href="/misode/loot-table/"]').first().click();
  await page.waitForURL('**/misode/loot-table/');
  await page.reload();
  await page.locator('header h1').waitFor();
  assert.equal(await page.locator('link[data-qust-oreui]').count(), 1);
  assert.match(await page.title(), /Loot Table|战利品/);
  // A schema-backed editor must load rather than a route-not-found or spinner-only shell.
  await page.locator('.ace_editor').first().waitFor({ timeout: 60000 });
  await page.locator('.node-header > label > span').filter({hasText:/^战利品池$/}).waitFor();
  await page.locator('.node-header').filter({has:page.locator('label > span').filter({hasText:/^战利品池$/})}).first().locator('button.add').first().click();
  await page.waitForFunction(() => document.querySelector('.ace_content')?.textContent?.includes('pools'));
  assert.ok(!(await page.locator('.ace_content').first().innerText()).includes('战利品池'));

  await page.waitForFunction(() => document.querySelector('.ace_content')?.textContent?.includes('{'), null, { timeout: 60000 });
  for (const path of ['/misode/convert/', '/misode/whats-new/']) {
    const response = await page.request.get(origin + path);
    assert.equal(response.status(), 200, path);
  }
  await page.locator('header a[href="/misode/"]').click();
  await page.waitForURL(origin + '/misode/');
  await page.goto(origin + '/misode/sulfur-cube-archetype/');
  await page.waitForFunction(() => document.querySelector('header h1')?.textContent?.includes('硫方怪原型'));
  await page.goto(origin + '/misode/advancement/');
  await page.locator('.node-header > label > span').filter({ hasText: /^完成要求$/ }).waitFor();
  for (const title of ['父进度','显示设置','判据']) assert.ok(await page.locator('.node-header > label > span').filter({ hasText: new RegExp('^' + title + '$') }).count());
  const requirements = page.locator('.node-header > label').filter({ has: page.locator('span').filter({ hasText: /^完成要求$/ }) }).first();
  await requirements.click();
  await requirements.locator('.node-doc').waitFor({state:'visible'});
  assert.match(await requirements.locator('.node-doc').innerText(), /判据/);
  assert.equal(await requirements.locator('.node-doc code').filter({hasText:/^criteria$/}).count(),1);
  // Resource completion must not invoke a browser datalist or create an unbounded DOM.
  const parentInput = page.locator('.node-header').filter({has:page.locator('label > span').filter({hasText:/^父进度$/})}).first().locator('input');
  await parentInput.click();
  await page.locator('[data-qust-completions]').waitFor();
  assert.equal(await parentInput.getAttribute('list'), null);
  assert.equal(await page.locator('datalist').count(), 0);
  assert.ok(await page.locator('[data-qust-completions] [role=option]').count() <= 60);
  await parentInput.fill('story/root');
  await page.locator('[data-qust-completions] [role=option]').filter({hasText:/^minecraft:story\/root$/}).waitFor();
  await parentInput.press('ArrowDown');
  await parentInput.press('Enter');
  await page.waitForFunction(() => document.querySelector('.ace_content')?.textContent?.includes('minecraft:story/root'));
  await parentInput.click();
  await page.locator('[data-qust-completions] [role=option]').first().click();
  await page.locator('[data-qust-completions]').waitFor({state:'hidden'});
  await parentInput.fill('custom:my_parent');
  await parentInput.press('Tab');
  await page.waitForFunction(() => document.querySelector('.ace_content')?.textContent?.includes('custom:my_parent'));
  await parentInput.click();
  await parentInput.press('Escape');
  await page.locator('[data-qust-completions]').waitFor({state:'hidden'});
  // Add a real optional field and verify the generated JSON still uses the original key.
  await page.locator('.node-header').filter({has:page.locator('label > span').filter({hasText:/^父进度$/})}).first().locator('input').fill('minecraft:story/root');
  await page.locator('.node-header').filter({has:page.locator('label > span').filter({hasText:/^父进度$/})}).first().locator('input').press('Tab');
  await page.waitForFunction(() => document.querySelector('.ace_content')?.textContent?.includes('parent'));
  assert.ok(!(await page.locator('.ace_content').first().innerText()).includes('父进度'));
  const texture = page.waitForResponse(origin + '/misode/images/cube.png');
  await page.goto(origin + '/misode/transformation/');
  assert.equal((await texture).status(), 200);
  await page.locator('canvas').first().waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  // The preview canvas resizes on the next animation frame after a viewport change.
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.getByRole('link', { name: '更多功能', exact: true }).first().click();
  await page.waitForURL(origin + '/tools/');
  await page.locator('a[href="/train/"]').click();
  await page.waitForURL(origin + '/train/');
  assert.deepEqual(missing, [], 'all local resources must exist');
  assert.deepEqual(errors, [], 'no uncaught browser errors');
});
