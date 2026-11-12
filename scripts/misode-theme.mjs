import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const themeInputs = [
  join(root, 'src/styles/vendor/oreui/colors.css'),
  join(root, 'src/styles/misode/oreui.css'),
  fileURLToPath(import.meta.url),
];

// Run before the upstream application reads Store.getLanguage(). Keep explicit choices.
const defaults = `<script data-qust-misode-defaults>try{if(localStorage.getItem('language')===null)localStorage.setItem('language','zh-cn');document.documentElement.lang=localStorage.getItem('language')||'zh-CN';}catch{document.documentElement.lang='zh-CN';}</script>`;

/** Inject our theme into every generated entry, without changing upstream source. */
export function applyMisodeTheme(directory) {
  const css = themeInputs.slice(0, 2).map(path => readFileSync(path, 'utf8')).join('\n');
  const hash = createHash('sha256');
  for (const path of themeInputs) hash.update(readFileSync(path));
  const version = hash.digest('hex').slice(0, 16);
  mkdirSync(join(directory, 'assets'), { recursive: true });
  writeFileSync(join(directory, 'assets/qust-oreui.css'), css);
  const link = `<link rel="stylesheet" href="/misode/assets/qust-oreui.css?v=${version}" data-qust-oreui>`;
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name.endsWith('.html')) {
        let html = readFileSync(file, 'utf8').replace(/\s*<link\b[^>]*\bdata-qust-oreui[^>]*>\s*/g, '');
        html = html.replace(/<script\b[^>]*\bdata-qust-misode-defaults[^>]*>[\s\S]*?<\/script>\s*/g, '');
        html = html.replace(/(<head\b[^>]*>)\s*/i, `$1\n${defaults}\n`);
        if (!html.includes('</head>')) throw new Error(`Missing head in Misode entry: ${file}`);
        writeFileSync(file, html.replace('</head>', `\n${link}\n</head>`));
      }
    }
  }
  visit(directory);
}
