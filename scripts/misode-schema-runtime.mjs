import translations from '../src/i18n/misode/advancement-zh-cn.json' with { type: 'json' };
import sources from '../src/i18n/misode/advancement-source.json' with { type: 'json' };

import commonTranslations from '../src/i18n/misode/common-zh-cn.json' with { type: 'json' };
import commonSources from '../src/i18n/misode/common-source.json' with { type: 'json' };

/** Display only: never mutates schema, document nodes, JSON keys or user data. */
export function translateAdvancementField(lang, pathname, label, doc, raw, entries = translations) {
  const route = pathname.replace(/\/$/, '').split('/').at(-1);
  const advancement = route === 'advancement';
  const common = ['loot-table', 'recipe', 'item-modifier', 'predicate', 'pack-mcmeta'].includes(route);
  if (lang !== 'zh-cn' || !pathname.startsWith('/misode/') || (!advancement && !common) || raw) return { label: undefined, doc };
  const catalog = advancement ? sources : commonSources;
  if (common && entries === translations) entries = commonTranslations;
  const key = String(label);
  const title = entries['label.' + key];
  // In pack filters, block means blocking resources, not the Minecraft block object.
  const ambiguousPackBlock = route === 'pack-mcmeta' && key === 'block';
  const translatedLabel = !ambiguousPackBlock && title && title.source === catalog['label.' + key] && title.review !== 'needs-context' ? title.translation : undefined;
  const entry = Object.entries(entries).find(([id, value]) => id.startsWith('doc.' + key + '.') && value.source === doc && value.review !== 'needs-context');
  return { label: translatedLabel, doc: entry ? entry[1].translation : doc };
}
