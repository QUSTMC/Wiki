import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, sep } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const owned = ['src', 'public', 'index.html', 'LICENSE', 'README.md', 'package.json', 'package-lock.json', 'vite.config.js', 'tsconfig.json', 'postcss.config.js', 'tailwind.config.js'];
function git(repo, args) {
  return execFileSync('git', ['-C', repo, ...args], { maxBuffer: 30 * 1024 * 1024 });
}
function list(repo, revision) {
  return git(repo, ['ls-tree', '-r', '--name-only', '-z', revision, '--', ...owned]).toString().split('\0').filter(Boolean);
}
function content(repo, revision, path, present) {
  return present.has(path) ? git(repo, ['show', `${revision}:${path}`]) : null;
}
function same(a, b) { return a === null || b === null ? a === b : a.equals(b); }

export function updateMisode(repo, workspace = root) {
  const destination = join(workspace, 'vendor/misode');
  const stateFile = join(workspace, 'vendor/misode-upstream.json');
  repo = resolve(repo);
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  const latest = git(repo, ['rev-parse', 'HEAD']).toString().trim();
  if (!/^[a-f0-9]{40}$/.test(latest) || !/^[a-f0-9]{40}$/.test(state.revision)) throw new Error('Invalid upstream revision');
  if (latest === state.revision) { console.log('Misode is up to date.'); return false; }
  git(repo, ['cat-file', '-e', `${state.revision}^{commit}`]);
  const basePaths = new Set(list(repo, state.revision));
  const nextPaths = new Set(list(repo, latest));
  const changes = [], conflicts = [];
  const scratch = mkdtempSync(join(tmpdir(), 'misode-merge-'));
  try {
    for (const path of new Set([...basePaths, ...nextPaths])) {
      const target = resolve(destination, path);
      if (!target.startsWith(resolve(destination) + sep)) throw new Error(`Invalid path: ${path}`);
      const base = content(repo, state.revision, path, basePaths);
      const incoming = content(repo, latest, path, nextPaths);
      const local = existsSync(target) ? readFileSync(target) : null;
      let merged;
      if (same(base, incoming)) continue;
      if (same(local, base) || same(local, incoming)) merged = incoming;
      else if (local === null || base === null || incoming === null || [local, base, incoming].some(b => b.includes(0))) {
        conflicts.push(path); continue;
      } else {
        for (const [name, data] of [['local', local], ['base', base], ['incoming', incoming]]) writeFileSync(join(scratch, name), data);
        // Ignore line-ending differences introduced by Windows checkouts.
        const result = spawnSync('git', ['-c', 'merge.renormalize=true', 'merge-file', '--stdout', '--', join(scratch, 'local'), join(scratch, 'base'), join(scratch, 'incoming')], { maxBuffer: 30 * 1024 * 1024 });
        if (result.error) throw result.error;
        if (result.status !== 0) { conflicts.push(path); continue; }
        merged = result.stdout;
      }
      changes.push({ target, merged });
    }
    if (conflicts.length) throw new Error(`Misode upstream conflicts with local adaptations; no files were changed:\n${conflicts.join('\n')}`);
    for (const { target, merged } of changes) {
      if (merged === null) rmSync(target);
      else { mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, merged); }
    }
    state.revision = latest;
    writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n');
    const note = join(destination, 'QUST-INTEGRATION.md');
    writeFileSync(note, readFileSync(note, 'utf8').replace(/提交：`[a-f0-9]+`/, `提交：\`${latest}\``));
    console.log(`Updated Misode to ${latest}; preserved local adaptations with a three-way merge.`);
    return true;
  } finally {
    if (!resolve(scratch).startsWith(resolve(tmpdir()) + sep)) throw new Error('Invalid merge temp directory');
    rmSync(scratch, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error('Usage: node scripts/update-misode.mjs <upstream-git-checkout>');
  updateMisode(process.argv[2]);
}

