import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { applyMisodeTheme } from '../scripts/misode-theme.mjs';

test('theme survives regenerated upstream output and is applied once after upstream styles on every entry', t => {
  const base = resolve(tmpdir());
  const output = mkdtempSync(join(base, 'misode-theme-test-'));
  t.after(() => {
    assert.ok(resolve(output).startsWith(base + sep));
    rmSync(output, { recursive: true, force: true });
  });
  mkdirSync(join(output, 'loot-table'));
  const upstream = '<!doctype html><html><head><link rel="stylesheet" href="/misode/assets/upstream.css"></head><body><div id="editor"></div></body></html>';
  for (const entry of ['index.html', 'loot-table/index.html', '404.html']) writeFileSync(join(output, entry), upstream);
  applyMisodeTheme(output);
  applyMisodeTheme(output);
  for (const entry of ['index.html', 'loot-table/index.html', '404.html']) {
    const html = readFileSync(join(output, entry), 'utf8');
    assert.equal((html.match(/data-qust-oreui/g) || []).length, 1);
    assert.equal((html.match(/data-qust-misode-defaults/g) || []).length, 1);
    assert.ok(html.indexOf('data-qust-misode-defaults') < html.indexOf('upstream.css'));
    assert.ok(html.indexOf('qust-oreui.css') > html.indexOf('upstream.css'));
    assert.match(html, /id="editor"/);
  }
  const first = readFileSync(join(output, 'index.html'), 'utf8');
  // Simulate an upstream rebuild overwriting the generated HTML.
  writeFileSync(join(output, 'index.html'), upstream);
  applyMisodeTheme(output);
  assert.equal(readFileSync(join(output, 'index.html'), 'utf8'), first);
  const css = readFileSync(join(output, 'assets/qust-oreui.css'), 'utf8');
  assert.match(css, /Spectrollay/);
  assert.match(css, /--primary-background:/);
  assert.match(css, /:root\.dark/);
  assert.match(css, /fusion-pixel.*woff2/);
});
