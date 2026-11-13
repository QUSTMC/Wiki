import full from '../src/i18n/misode/full-zh-cn.json' with { type: 'json' };
import manifest from '../src/i18n/misode/full-source.json' with { type: 'json' };
const tables = { label: new Map(), doc: new Map(), ui: new Map() };
for (const [id, entry] of Object.entries(full)) {
  const source = manifest[id];
  if (!source || source.source !== entry.source || entry.review === 'needs-context') continue;
  tables[source.kind]?.set(entry.source, entry.translation);
}
export function translateDisplay(source, kind = 'label', lang) {
  if (typeof source !== 'string') return source;
  let language = lang;
  if (!language) { try { language = localStorage.getItem('language') } catch { return source } }
  if (language !== 'zh-cn') return source;
  const translated = tables[kind]?.get(source);
  return translated ?? source;
}
export function fullFieldTranslation(lang, label, doc, raw) {
  if (lang !== 'zh-cn' || raw) return { label: undefined, doc };
  const text = String(label).replace(/^minecraft:/, '').replaceAll('_', ' ').replace(/[a-z][A-Z]+/g, m => m[0] + ' ' + m.slice(1).toLowerCase()).replace(/^./, c => c.toUpperCase());
  const translated = translateDisplay(text, 'label', lang);
  return { label: translated === text ? undefined : translated, doc: translateDisplay(doc, 'doc', lang) };
}

export function translatePattern(source, values, lang) {
  return translateDisplay(source, 'ui', lang).replace(/%(\d+)%/g, (match, index) => index in values ? String(values[index]) : match);
}
