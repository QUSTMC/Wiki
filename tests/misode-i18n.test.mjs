import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTerms, scopedTerms, protect, restore, parseOutput, termWarnings } from '../scripts/translate-misode.mjs';
import { mergeMisodeChinese } from '../scripts/misode-i18n.mjs';

test('glossary matches longest non-overlapping terms and respects key-scoped tables', () => {
  const rows = [
    {en:'Pale',zh:'苍白'}, {en:'Hanging',zh:'悬挂'}, {en:'Moss',zh:'苔藓'},
    {en:'Pale Hanging Moss',zh:'苍白垂须'}, {en:'Chain',zh:'链'},
  ];
  assert.deepEqual(matchTerms('Pale Hanging Moss Enchant',rows).map(x=>x.en), ['Pale Hanging Moss']);
  const tables = {main:[{en:'Fish',zh:'鱼'}], mod:[], special:[{token:'tropical_fish',terms:[{en:'Fish',zh:'热带鱼'}]}]};
  assert.equal(scopedTerms('item.cod',tables)[0].zh,'鱼');
  assert.equal(scopedTerms('entity.tropical_fish',tables)[0].zh,'热带鱼');
  const modTables = {main:[], special:[], mod:[{en:'Modifier',zh:'强化',source:'Tinkers’ Construct'},{en:'Modifier',zh:'修饰符',source:''}]};
  assert.equal(scopedTerms('generator.loot-table-modifier:loot_modifier',modTables)[0].zh,'修饰符');
  assert.equal(termWarnings('深层矿石', [{en:'Deepslate',zh:'深层|深板岩',count:1}]).length,0);
});

test('protected tokens preserve placeholders, URLs and filenames, rejecting dropped or repeated tokens', () => {
  const value = protect('Copy %0% from `loot_table` to Sounds.json');
  let translated = value.text.replace('Copy','复制').replace(' from ',' 从 ').replace(' to ',' 到 ');
  assert.equal(restore(translated,value.tokens),'复制 %0% 从 `loot_table` 到 Sounds.json');
  assert.throws(()=>restore(translated.replace(value.tokens[0].token,''),value.tokens),/missing or repeated/);
  assert.throws(()=>restore(translated+value.tokens[0].token,value.tokens),/missing or repeated/);
  assert.throws(()=>parseOutput('<translations>{"other":"错"}</translations>',['expected']),/key set/);
  assert.deepEqual(parseOutput('<translations>{"id":"译文"}</translations>',['id']),{id:'译文'});
});

test('local translations overlay only matching English sources and leave upstream data unchanged', () => {
  const upstream = {known:'原有译文'};
  const overlay = {known:{source:'Known',translation:'本地译文'},added:{source:'Added',translation:'补充译文'},changed:{source:'Old',translation:'过期译文'},uncertain:{source:'Unknown',translation:'候选',review:'needs-context'}};
  const result = mergeMisodeChinese({known:'Known',added:'Added',changed:'New',uncertain:'Unknown'},upstream,overlay);
  assert.deepEqual(result.merged,{known:'本地译文',added:'补充译文'});
  assert.deepEqual(result.stale,['changed']);
  assert.deepEqual(result.pending,['uncertain']);
  assert.deepEqual(upstream,{known:'原有译文'});
});
