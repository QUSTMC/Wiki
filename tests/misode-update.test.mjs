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
