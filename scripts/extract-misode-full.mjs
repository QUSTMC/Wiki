import ts from '../vendor/misode/node_modules/typescript/lib/typescript.js';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
const root=resolve('.');
const dir=join(root,'src/i18n/misode');
const symbols=JSON.parse(readFileSync(process.argv[2],'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,16);
const format=s=>s.replace(/^minecraft:/,'').replaceAll('_',' ').replace(/[a-z][A-Z]+/g,m=>m[0]+' '+m.slice(1).toLowerCase()).replace(/^./,c=>c.toUpperCase());
const entries={};
function add(kind,source,context,raw) {
 if(typeof source!=='string'||!/[a-zA-Z]{2}/.test(source)||/[\u4e00-\u9fff]/.test(source))return;
 const id=kind+'.'+hash(source);
 if(!entries[id])entries[id]={kind,source,contexts:[],raw:[]};
 if(context&&!entries[id].contexts.includes(context))entries[id].contexts.push(context);
 if(raw&&!entries[id].raw.includes(raw))entries[id].raw.push(raw);
}
function walk(v,ctx) {
 if(Array.isArray(v)) {for(const x of v)walk(x,ctx);return;}
 if(!v||typeof v!=='object')return;
 if(v.kind==='pair'&&typeof v.key==='string')add('label',format(v.key),ctx,v.key);
 if(typeof v.desc==='string')add('doc',v.desc,ctx);
 if(v.kind==='literal'&&v.value&&v.value.kind==='string'&&typeof v.value.value==='string') {
  const val=v.value.value;
  if(/^(?:minecraft:)?[a-z][a-z0-9_]*$/.test(val))add('label',format(val),ctx,val);
 }
 for(const x of Object.values(v))walk(x,ctx);
}
for(const section of ['mcdoc','mcdoc/dispatcher'])for(const [key,v]of Object.entries(symbols[section]))walk(v,key);
function* files(path) {for(const e of readdirSync(path,{withFileTypes:true})){const p=join(path,e.name);if(e.isDirectory())yield* files(p);else yield p;}}
for(const path of files('vendor/misode/public/mcdoc')){
 const text=readFileSync(path,'utf8');
 for(const m of text.matchAll(/(?:^\s*\/\/\/[^\n]*(?:\n|$))+/gm)){
  const doc=m[0].split(/\r?\n/).filter(l=>l.includes('///')).map(l=>l.replace(/^\s*\/\/\/ ?/,'')).join('\n');add('doc',doc,path);
 }
 for(const m of text.matchAll(/^\s*([a-zA-Z][\w]*)(?:\?)?:\s/gm))add('label',format(m[1]),path,m[1]);
}
const uiAttributes=new Set(['title','desc','placeholder','aria-label','label','alt']);
for(const path of files('vendor/misode/src/app')){
 if(!path.endsWith('.tsx'))continue;
 const text=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){
  if(ts.isJsxText(node)) {const value=node.text.replace(/\s+/g,' ').trim();if(/[a-zA-Z]{2}/.test(value))add('ui',value,path);}
  if(ts.isJsxAttribute(node)&&uiAttributes.has(node.name.getText(ast))&&node.initializer&&ts.isStringLiteral(node.initializer))add('ui',node.initializer.text,path);
  ts.forEachChild(node,visit);
 }visit(ast);
}
const old={};
for(const file of ['advancement-zh-cn.json','common-zh-cn.json','home-zh-cn.json']) {
 for(const entry of Object.values(JSON.parse(readFileSync(join(dir,file),'utf8'))))if(!entry.review)old[entry.source]=entry.translation;
}
const outputPath=join(dir,'full-zh-cn.json');const output=existsSync(outputPath)?JSON.parse(readFileSync(outputPath,'utf8')):{};
for(const [id,entry] of Object.entries(entries))if(old[entry.source]&&!output[id])output[id]={source:entry.source,translation:old[entry.source],origin:'existing-local'};
mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'full-source.json'),JSON.stringify(entries,null,2)+'\n');writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
writeFileSync(join(dir,'full-provenance.json'),JSON.stringify({ref:symbols.ref,model:'google/gemma-4-12b-qat',scope:'all vanilla-mcdoc symbols, bundled partner mcdoc comments/fields, static JSX text and display attributes',schemaRepository:'https://github.com/SpyglassMC/vanilla-mcdoc',glossaryRepository:'https://github.com/CFPAOrg/Glossary'},null,2)+'\n');
console.log({entries:Object.keys(entries).length,existing:Object.keys(output).length,characters:Object.values(entries).reduce((n,e)=>n+e.source.length,0),byKind:Object.values(entries).reduce((s,e)=>(s[e.kind]=(s[e.kind]||0)+1,s),{})});
