// Build-only overlay: leaves the entire upstream checkout untouched.
import { loadConfigFromFile, mergeConfig } from '../vendor/misode/node_modules/vite/dist/node/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mergeMisodeChinese, readMisodeOverlay } from './misode-i18n.mjs';

const source = fileURLToPath(new URL('../vendor/misode/', import.meta.url));
const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, source + 'vite.config.js', source);
if (!loaded) throw new Error('Cannot load upstream Misode Vite config');
export default mergeConfig(loaded.config, {
  plugins: [{
    name: 'qust-misode-chinese',
    enforce: 'pre',
    transform(code, id) {
      if (id.replaceAll('\\', '/').split('?')[0].endsWith('/app/pages/Home.tsx')) {
        const toolsAnchor = /function Tools\(\)\s*\{\s*const \{\s*locale\s*\}\s*=\s*useLocale\(\)/;
        if (!toolsAnchor.test(code)) this.error('Misode homepage tools changed; review localized tool cards');
        code = code.replace(toolsAnchor, 'function Tools() {\n\tconst { locale, lang } = useLocale()');
        const homeTranslations = JSON.parse(readFileSync(fileURLToPath(new URL('../src/i18n/misode/home-zh-cn.json', import.meta.url)), 'utf8'));
        for (const [key, entry] of Object.entries(homeTranslations)) {
          const attr = key.split('.').at(-1);
          if (!['title', 'desc'].includes(attr) || !entry.translation) this.error(`Invalid homepage translation: ${key}`);
          const original = `${attr}=${JSON.stringify(entry.source)}`;
          if (!code.includes(original)) { this.warn(`Homepage tool text changed; review translation: ${key}`); continue; }
          code = code.replace(original, `${attr}={lang === 'zh-cn' ? ${JSON.stringify(entry.translation)} : ${JSON.stringify(entry.source)}}`);
        }
        const anchor = 'return <main>';
        if (!code.includes(anchor)) this.error('Misode homepage changed; review translation attribution injection');
        return { code: code.replace(anchor, anchor + `
          <aside class="qust-translation-notice" data-qust-translation-notice>
            <strong>汉化说明</strong>
            <p>本站补充汉化由本地 AI 生成，结合 <a href="https://github.com/CFPAOrg/Glossary" target="_blank" rel="noopener noreferrer">CFPAOrg/Glossary 术语库</a> 提供的术语与参考资料。译文可能存在错误，请结合英文原文核对。</p>
          </aside>
        `), map: null };
      }

      if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/components/generator/McdocRenderer.tsx')) return;
      code = code.replace('const datalistId = `mcdoc_completions_${hexId()}`', 'const datalistId = useMemo(() => `mcdoc_completions_${hexId()}`, [])');
      const datalistStart = code.indexOf('\t\t\t{completions.length > 0 && <datalist');
      const datalistEnd = code.indexOf('\n\t\t\t{value && gen && <a', datalistStart);
      if (datalistStart < 0 || datalistEnd < 0) this.error('Misode completion renderer changed; review bounded autocomplete adapter');
      code = code.slice(0, datalistStart) + `<QustCompletionInput
        options={completions.map(c => c.value)} value={value ?? ''} id={datalistId}
        className={colorKind === 'hex_rgb' ? 'short-input' : idRegistry ? 'long-input' : ''}
        onValue={setValue} onCommit={onChangeValue} />` + code.slice(datalistEnd);
      const completionComponent = readFileSync(fileURLToPath(new URL('../src/integrations/misode/CompletionInput.tsx', import.meta.url)), 'utf8');
      code = `import { createPortal as qustCreatePortal } from 'preact/compat';\n` + code + '\n' + completionComponent;
      const original = "function Key({ label, doc, raw }: KeyProps) {";
      const rendering = "{raw ? label.toString() : formatIdentifier(label.toString())}";
      if (!code.includes(original) || !code.includes(rendering)) this.error('Misode schema renderer changed; review the display-only translation adapter');
      const runtime = fileURLToPath(new URL('./misode-schema-runtime.mjs', import.meta.url));
      code = `import { translateAdvancementField } from ${JSON.stringify(runtime)};\n` + code;
      code = code.replace(original, original + `
  const { lang } = useLocale()
  const translated = translateAdvancementField(lang, location.pathname, label, doc, raw)
  doc = translated.doc
`);
      code = code.replace(rendering, "{translated.label ?? (raw ? label.toString() : formatIdentifier(label.toString()))}");
      return { code, map: null };
    },
    load(id) {
      if (!id.replaceAll('\\', '/').split('?')[0].endsWith('/src/locales/zh-cn.json')) return;
      const english = JSON.parse(readFileSync(source + 'src/locales/en.json', 'utf8'));
      const upstream = JSON.parse(readFileSync(source + 'src/locales/zh-cn.json', 'utf8'));
      const { merged, stale, pending } = mergeMisodeChinese(english, upstream, readMisodeOverlay());
      if (stale.length) this.warn(`Review local translations for changed/removed English keys: ${stale.join(', ')}`);
      if (pending.length) this.warn(`Keeping English for translations awaiting domain context: ${pending.join(', ')}`);
      return JSON.stringify(merged);
    },
  }],
});
