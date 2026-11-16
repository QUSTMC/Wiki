import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { updateMisode } from '../scripts/update-misode.mjs';

function fixture(t) {
  const tempRoot = resolve(tmpdir());
  const workspace = mkdtempSync(join(tempRoot, 'misode-update-test-'));
  t.after(() => {
    assert.ok(resolve(workspace).startsWith(tempRoot + sep));
    rmSync(workspace, { recursive: true, force: true });
  });
  const upstream = join(workspace, 'upstream');
  mkdirSync(upstream);
  const git = (...args) => execFileSync('git', ['-C', upstream, '-c', 'core.autocrlf=false', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', ...args], { encoding: 'utf8' }).trim();
  const put = (name, content) => { mkdirSync(dirname(name), { recursive: true }); writeFileSync(name, content); };
  git('init', '-q');
  const original = 'base\n' + 'unchanged\n'.repeat(10) + 'tail\n';
  put(join(upstream, 'src/example.ts'), original);
  put(join(upstream, 'public/old.txt'), 'remove me');
  git('add', '.'); git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD');
  put(join(workspace, 'vendor/misode/src/example.ts'), original.replace('base', 'QUST MC'));
  put(join(workspace, 'vendor/misode/public/old.txt'), 'remove me');
  put(join(workspace, 'vendor/misode/src/qust/custom.ts'), 'local only');
  put(join(workspace, 'src/styles/misode/oreui.css'), 'QUST MC theme outside upstream');
  put(join(workspace, 'vendor/misode/QUST-INTEGRATION.md'), `提交：\`${base}\``);
  put(join(workspace, 'vendor/misode-upstream.json'), JSON.stringify({ revision: base }));
  return { workspace, upstream, git, put, original, base };
}

test('upstream update merges changes, additions and deletions while preserving local customizations', t => {
  const f = fixture(t);
  f.put(join(f.upstream, 'src/example.ts'), f.original.replace('tail', 'new upstream tail'));
  f.put(join(f.upstream, 'src/new.ts'), 'new generator');
  f.git('rm', 'public/old.txt');
  f.git('add', '.'); f.git('commit', '-qm', 'update');
  const head = f.git('rev-parse', 'HEAD');
  assert.equal(updateMisode(f.upstream, f.workspace), true);
  assert.equal(readFileSync(join(f.workspace, 'src/styles/misode/oreui.css'), 'utf8'), 'QUST MC theme outside upstream');
  const output = readFileSync(join(f.workspace, 'vendor/misode/src/example.ts'), 'utf8');
  assert.match(output, /QUST MC/);
  assert.match(output, /new upstream tail/);
  assert.equal(readFileSync(join(f.workspace, 'vendor/misode/src/qust/custom.ts'), 'utf8'), 'local only');
  assert.equal(readFileSync(join(f.workspace, 'vendor/misode/src/new.ts'), 'utf8'), 'new generator');
  assert.equal(existsSync(join(f.workspace, 'vendor/misode/public/old.txt')), false);
  assert.equal(JSON.parse(readFileSync(join(f.workspace, 'vendor/misode-upstream.json'), 'utf8')).revision, head);
  assert.equal(updateMisode(f.upstream, f.workspace), false);
});

test('conflicts stop the entire update without changing the vendor or revision', t => {
  const f = fixture(t);
  f.put(join(f.upstream, 'src/example.ts'), f.original.replace('base', 'upstream conflict'));
  f.put(join(f.upstream, 'src/new.ts'), 'must not be written');
  f.git('add', '.'); f.git('commit', '-qm', 'conflict');
  const local = readFileSync(join(f.workspace, 'vendor/misode/src/example.ts'), 'utf8');
  assert.throws(() => updateMisode(f.upstream, f.workspace), /conflicts.*local adaptations/s);
  assert.equal(readFileSync(join(f.workspace, 'vendor/misode/src/example.ts'), 'utf8'), local);
  assert.equal(existsSync(join(f.workspace, 'vendor/misode/src/new.ts')), false);
  assert.equal(JSON.parse(readFileSync(join(f.workspace, 'vendor/misode-upstream.json'), 'utf8')).revision, f.base);
});

test('legacy dependency path does not conflict with upstream await and backup changes', t => {
  const f = fixture(t);
  const path = 'src/app/services/DataFetcher.ts';
  const original = "const CACHE_NAME = 'old'\nexport async function fetchDependencyMcdoc(dependency: string) {\n  return cachedFetch(`/mcdoc/${dependency}.mcdoc`, { refresh: true })\n}\n";
  f.put(join(f.upstream, path), original);
  f.git('add', '.'); f.git('commit', '-qm', 'fetch base');
  const base = f.git('rev-parse', 'HEAD');
  f.put(join(f.workspace, 'vendor/misode-upstream.json'), JSON.stringify({revision:base}));
  // Simulate the old Windows import: CRLF plus the locally prefixed path.
  f.put(join(f.workspace, 'vendor/misode', path), original.replace('/mcdoc/', '/misode/mcdoc/').replaceAll('\n', '\r\n'));
  const incoming = original.replace("CACHE_NAME = 'old'", "CACHE_NAME = 'new'").replace('return cachedFetch(', 'return await cachedFetch(');
  f.put(join(f.upstream, path), incoming);
  f.git('add', '.'); f.git('commit', '-qm', 'await and cache update');
  assert.equal(updateMisode(f.upstream, f.workspace), true);
  const result = readFileSync(join(f.workspace, 'vendor/misode', path), 'utf8');
  assert.equal(result, incoming);
  assert.match(result, /return await cachedFetch/);
  assert.match(result, /CACHE_NAME = 'new'/);
  assert.ok(!result.includes('/misode/mcdoc/'), 'path adaptation belongs to build overlay');
});

test('CRLF checkout does not conflict with independent upstream text changes', t => {
  const f = fixture(t);
  const path = join(f.workspace, 'vendor/misode/src/example.ts');
  f.put(path, f.original.replace('base', 'QUST MC').replaceAll('\n', '\r\n'));
  f.put(join(f.upstream, 'src/example.ts'), f.original.replace('tail', 'updated tail'));
  f.git('add', '.'); f.git('commit', '-qm', 'upstream tail');
  updateMisode(f.upstream, f.workspace);
  const result = readFileSync(path, 'utf8');
  assert.match(result,/QUST MC/);
  assert.match(result,/updated tail/);
  assert.ok(!result.includes('\r'));
});

test('real fetch logic conflicts still abort atomically after removing only the legacy path', t => {
  const f = fixture(t);
  const path = 'src/app/services/DataFetcher.ts';
  const original = "return cachedFetch(`/mcdoc/${dependency}.mcdoc`, { refresh: true })\n";
  f.put(join(f.upstream,path),original);
  f.git('add','.'); f.git('commit','-qm','fetch baseline');
  const base = f.git('rev-parse','HEAD');
  f.put(join(f.workspace,'vendor/misode-upstream.json'),JSON.stringify({revision:base}));
  const local = original.replace('/mcdoc/','/misode/mcdoc/').replace('refresh: true','refresh: false');
  f.put(join(f.workspace,'vendor/misode',path),local);
  f.put(join(f.upstream,path),original.replace('refresh: true','refresh: true, decode: customDecoder'));
  f.git('add','.'); f.git('commit','-qm','competing behavior');
  assert.throws(()=>updateMisode(f.upstream,f.workspace),/conflicts.*local adaptations/s);
  assert.equal(readFileSync(join(f.workspace,'vendor/misode',path),'utf8'),local);
  assert.equal(JSON.parse(readFileSync(join(f.workspace,'vendor/misode-upstream.json'),'utf8')).revision,base);
});
