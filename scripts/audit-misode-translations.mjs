import {readFileSync,writeFileSync} from 'node:fs';
import {protect} from './translate-misode.mjs';
const dir='src/i18n/misode';
const source=JSON.parse(readFileSync(dir+'/full-source.json','utf8'));
const output=JSON.parse(readFileSync(dir+'/full-zh-cn.json','utf8'));
const report={sourceEntries:Object.keys(source).length,translated:0,byKind:{},missing:[],stale:[],invalid:[],technicalOrProperNames:[],riskCandidates:[]};
const numbers=t=>(t.match(/(?<![\w])\d+(?:\.\d+)*(?![\w])/g)||[]).sort();
for(const [id,item]of Object.entries(source)){
 const row=output[id];
 if(!row){report.missing.push(id);continue;}
 if(row.source!==item.source){report.stale.push(id);continue;}
 if(typeof row.translation!=='string'||!row.translation.trim()||row.translation.includes('\uFFFD')){report.invalid.push(id);continue;}
 const a=protect(item.source).tokens.map(x=>x.literal).sort(),b=protect(row.translation).tokens.map(x=>x.literal).sort();
 if(JSON.stringify(a)!==JSON.stringify(b))report.invalid.push(id);
 report.translated++;report.byKind[item.kind]=(report.byKind[item.kind]||0)+1;
 if(!/[\u4e00-\u9fff]/.test(row.translation))report.technicalOrProperNames.push({id,source:item.source,translation:row.translation});
 if(JSON.stringify(numbers(item.source))!==JSON.stringify(numbers(row.translation)))report.riskCandidates.push({id,reason:'numeric tokens differ',source:item.source,translation:row.translation});
 if(/\b(?:all|any|unless|must not|inclusive|exclusive|at least|at most|default)\b/i.test(item.source)&&item.kind==='doc')report.riskCandidates.push({id,reason:'logic/default/range',source:item.source,translation:row.translation});
}
writeFileSync(dir+'/full-coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({entries:report.sourceEntries,translated:report.translated,missing:report.missing.length,stale:report.stale.length,invalid:report.invalid.length,technical:report.technicalOrProperNames.length,riskCandidates:report.riskCandidates.length,byKind:report.byKind},null,2));
if(process.argv.includes('--strict')&&(report.missing.length||report.stale.length||report.invalid.length))process.exitCode=1;
