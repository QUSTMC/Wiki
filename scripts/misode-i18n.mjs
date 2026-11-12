import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const misodeTranslationFile = fileURLToPath(new URL('../src/i18n/misode/zh-cn.json', import.meta.url));
export function mergeMisodeChinese(english, upstream, overlay) {
  const merged = { ...upstream }, stale = [], pending = [];
  for (const [key, entry] of Object.entries(overlay)) {
    if (!entry || typeof entry.source !== 'string' || typeof entry.translation !== 'string' || !entry.translation.trim()) throw new Error(`Invalid local translation: ${key}`);
    if (entry.review === 'needs-context') { pending.push(key); continue; }
    if (english[key] !== entry.source) { stale.push(key); continue; }
    merged[key] = entry.translation;
  }
  return { merged, stale, pending };
}
export function readMisodeOverlay() {
  return existsSync(misodeTranslationFile) ? JSON.parse(readFileSync(misodeTranslationFile, 'utf8')) : {};
}
