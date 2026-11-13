import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { translateStaticJsx } from '../scripts/misode-jsx-i18n.mjs';
import { translateDisplay, fullFieldTranslation } from '../scripts/misode-full-runtime.mjs';

test('static JSX translation touches visible copy only, never data props, URLs or callbacks', () => {
  const code = `export function Demo(){ const name='Hello world'; return <section><span>Hello world</span><input value="Hello world" placeholder="Hello world" /><a href="/Hello world/" onClick={()=>save('Hello world')}>Hello world</a></section> }`;
  const result = translateStaticJsx(code, '/src/app/Test.tsx', new Set(['Hello world']), '/runtime.mjs');
  assert.ok(result);
  assert.match(result, /qustDisplayText\("Hello world", 'ui'\)/);
  assert.match(result, /value="Hello world"/);
  assert.match(result, /href="\/Hello world\/"/);
  assert.match(result, /save\('Hello world'\)/);
  assert.match(result, /const name='Hello world'/);
  assert.equal(translateStaticJsx(code, '/src/data/config.ts', new Set(['Hello world']), '/runtime.mjs'),null);
  assert.match(translateStaticJsx("throw new Error('Expected an entry')", '/src/app/Test.ts', new Set(['Expected an entry']), '/runtime.mjs'), /new Error\(qustDisplayText/);
});

test('full schema fallback is Chinese-only and preserves user keys and unknown upstream documents', () => {
  const text = 'Never seen upstream text';
  assert.equal(translateDisplay(text,'doc','zh-cn'),text);
  assert.equal(translateDisplay('Type','label','en'),'Type');
  assert.deepEqual(fullFieldTranslation('zh-cn','my_custom_key',text,true),{label:undefined,doc:text});
  assert.equal(fullFieldTranslation('en','type',text,false).label,undefined);
});


test('every entry in the pinned translation inventory has a matching nonempty result', () => {
  const source = JSON.parse(readFileSync('src/i18n/misode/full-source.json','utf8'));
  const translations = JSON.parse(readFileSync('src/i18n/misode/full-zh-cn.json','utf8'));
  for (const [id,entry] of Object.entries(source)) {
    assert.equal(translations[id]?.source,entry.source,id);
    assert.ok(translations[id]?.translation?.trim(),id);
  }
});
