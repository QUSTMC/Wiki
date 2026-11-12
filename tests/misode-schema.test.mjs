import test from 'node:test';
import assert from 'node:assert/strict';
import { translateAdvancementField } from '../scripts/misode-schema-runtime.mjs';

test('schema translation changes only displayed text in Chinese advancement pages', () => {
  const original = 'If `requirements` is not defined, all defined criteria will be required.';
  const fields = {criteria: {example: {trigger:'minecraft:tick'}}, requirements:[['example']]};
  const before = JSON.stringify(fields);
  assert.equal(translateAdvancementField('zh-cn','/misode/advancement/','requirements',undefined,false).label,'完成要求');
  const result = translateAdvancementField('zh-cn','/misode/advancement/','criteria',original,false);
  assert.equal(result.label,'判据');
  assert.notEqual(result.doc,original);
  assert.match(result.doc,/`requirements`/);
  assert.equal(JSON.stringify(fields),before);
  for (const [lang,path,raw] of [['en','/misode/advancement/',false],['zh-cn','/misode/recipe/',false],['zh-cn','/misode/advancement/',true]]) {
    assert.deepEqual(translateAdvancementField(lang,path,'criteria',original,raw),{label:undefined,doc:original});
  }
  assert.equal(translateAdvancementField('zh-cn','/misode/advancement/','criteria','Changed upstream documentation',false).doc,'Changed upstream documentation');
});


test('common generators use route-scoped labels and exact source documentation', () => {
  const passAll = 'Passes when all of these conditions pass.';
  const passAny = 'Passes when any of these conditions pass.';
  for (const route of ['loot-table','recipe','item-modifier','predicate','pack-mcmeta']) {
    assert.equal(translateAdvancementField('zh-cn',`/misode/${route}/`,'type',undefined,false).label,'类型');
  }
  const all = translateAdvancementField('zh-cn','/misode/predicate/','terms',passAll,false);
  const any = translateAdvancementField('zh-cn','/misode/predicate/','terms',passAny,false);
  assert.match(all.doc,/所有|全部/);
  assert.match(any.doc,/任意|任何|一个/);
  assert.notEqual(all.doc,any.doc);
  assert.deepEqual(translateAdvancementField('zh-cn','/misode/worldgen/biome/','type',passAll,false),{label:undefined,doc:passAll});
  assert.deepEqual(translateAdvancementField('zh-cn','/misode/loot-table/','type',passAll,true),{label:undefined,doc:passAll});
});
