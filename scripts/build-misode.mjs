import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { applyMisodeTheme } from './misode-theme.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'vendor/misode');
const destination = join(root, 'public/misode');
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: source, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Misode build failed (exit ${result.status})`);
}
function digest(paths) {
  const hash = createHash('sha256');
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      if (['node_modules', 'dist'].includes(entry.name)) continue;
      const full = join(path, entry.name);
      if (entry.isDirectory()) visit(full);
      else { hash.update(full.slice(source.length)); hash.update(readFileSync(full)); }
    }
  }
  for (const path of paths) visit(path);
  return hash.digest('hex');
}
export function buildMisode() {
  const fingerprintHash = createHash('sha256').update(digest([source]));
  for (const file of ['src/i18n/misode/zh-cn.json', 'scripts/misode-i18n.mjs', 'scripts/misode-vite.config.mjs', 'scripts/misode-schema-runtime.mjs', 'src/i18n/misode/advancement-source.json', 'src/i18n/misode/advancement-zh-cn.json', 'src/i18n/misode/common-source.json', 'src/i18n/misode/common-zh-cn.json', 'src/i18n/misode/home-source.json', 'src/i18n/misode/home-zh-cn.json', 'src/integrations/misode/CompletionInput.tsx', 'scripts/misode-full-runtime.mjs', 'scripts/misode-jsx-i18n.mjs', 'src/i18n/misode/full-source.json', 'src/i18n/misode/full-zh-cn.json']) fingerprintHash.update(readFileSync(join(root, file)));
  const fingerprint = fingerprintHash.digest('hex');
  const marker = join(destination, '.build-hash');
  if (existsSync(join(destination, 'index.html')) && existsSync(marker) && readFileSync(marker, 'utf8') === fingerprint) {
    applyMisodeTheme(destination);
    return;
  }
  const lockHash = createHash('sha256').update(readFileSync(join(source, 'package-lock.json'))).digest('hex');
  const installed = join(source, 'node_modules/.qust-lock-hash');
  if (!existsSync(join(source, 'node_modules/vite/bin/vite.js')) || !existsSync(installed) || readFileSync(installed, 'utf8') !== lockHash) {
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !existsSync(npmCli)) throw new Error('Misode dependencies need installing. Please run npm run build (or npm run dev) using your Node.js manager.');
    run([npmCli, 'ci', '--include=dev', '--no-audit', '--no-fund']);
    writeFileSync(installed, lockHash);
  }
  console.log('[misode] Building local Minecraft generators…');
  run([join(source, 'node_modules/typescript/bin/tsc'), '--noEmit']);
  run([join(source, 'node_modules/vite/bin/vite.js'), 'build', '--config', join(root, 'scripts/misode-vite.config.mjs')]);
  // This directory contains only generated files from this application.
  if (resolve(destination) !== resolve(root, 'public', 'misode')) throw new Error('Invalid Misode output directory');
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(source, 'dist'), destination, { recursive: true });
  cpSync(join(source, 'LICENSE'), join(destination, 'LICENSE'));
  applyMisodeTheme(destination);
  writeFileSync(marker, fingerprint);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildMisode();
