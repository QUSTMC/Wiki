import ts from '../vendor/misode/node_modules/typescript/lib/typescript.js';
import { readFileSync,writeFileSync,readdirSync } from 'node:fs';
import {join}from'node:path';import{createHash}from'node:crypto';
const file='src/i18n/misode/full-source.json',manifest=JSON.parse(readFileSync(file,'utf8'));
function add(source,context){if(!/[A-Za-z]{2}/.test(source)||/[\u4e00-\u9fff]/.test(source))return;const id='ui.'+createHash('sha256').update(source).digest('hex').slice(0,16);if(!manifest[id])manifest[id]={kind:'ui',source,contexts:[context],raw:[]};}
function* files(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const f=join(dir,e.name);if(e.isDirectory())yield*files(f);else if(/\.tsx?$/.test(f))yield f;}}
for(const path of files('vendor/misode/src/app')){
 const code=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,code,ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 function visit(n){
  if(ts.isNewExpression(n)&&n.expression.getText(ast)==='Error')for(const a of n.arguments||[])if(ts.isStringLiteral(a)||ts.isNoSubstitutionTemplateLiteral(a))add(a.text,path);
  if(ts.isPropertyAssignment(n)&&/^(?:label|title|description|placeholder|tooltip)$/.test(n.name.getText(ast))&&ts.isStringLiteral(n.initializer))add(n.initializer.text,path);
  if(ts.isTemplateExpression(n)&&ts.isBinaryExpression(n.parent)&&n.parent.left.getText(ast).endsWith('.message')){
   const source=n.head.text+n.templateSpans.map((span,i)=>`%${i}%`+span.literal.text).join('');add(source,path);
  }
  ts.forEachChild(n,visit);
 }visit(ast);
}
for(const source of ['Object','String','Number','List','Boolean','Any','Double','Float','Byte','Int','Long','Short','Tuple','Unsafe','Entry']){
 const id='label.'+createHash('sha256').update(source).digest('hex').slice(0,16);if(!manifest[id])manifest[id]={kind:'label',source,contexts:['Mcdoc primitive type display'],raw:[source.toLowerCase()]};
}
const before=Object.keys(JSON.parse(readFileSync(file,'utf8'))).length;writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');console.log({before,after:Object.keys(manifest).length});
