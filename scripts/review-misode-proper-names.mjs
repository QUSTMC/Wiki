import {readFileSync,writeFileSync}from'node:fs';
import{parseOutput}from'./translate-misode.mjs';
const p='src/i18n/misode/zh-cn.json',d=JSON.parse(readFileSync(p,'utf8'));
const rows=Object.fromEntries(Object.entries(d).filter(([,v])=>v.review==='needs-context').map(([k,v])=>[k,v.source]));
const prompt='<rules>Translate interface display titles to Simplified Chinese. Keep unknown proper mod terminology as proper names. Specifically preserve JSG RIG as a proper name, translate Waves as 波次 (game encounter waves, not physical waves); preserve Pixelmon Raid as a proper game-mode name because its official Chinese name is not confirmed. Translate Ally Set as 盟友集合, Spawn Set as 生成集合. Return ONLY <translations>JSON strings with exact keys</translations>. Never expand RIG or claim an official Chinese name.</rules><source>'+JSON.stringify(rows)+'</source>';
const res=await fetch('http://198.18.0.1:1234/api/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'google/gemma-4-12b-qat',input:prompt,reasoning:'off',temperature:0.1,max_output_tokens:600,store:false}),signal:AbortSignal.timeout(120000)});
if(!res.ok)throw new Error('Model HTTP '+res.status);const response=await res.json();const values=parseOutput(response.output.filter(x=>x.type==='message').map(x=>x.content).join('\n'),Object.keys(rows));
for(const [k,v]of Object.entries(values)){d[k].translation=v;d[k].review='proper-name-preserved';d[k].reviewNote='保留未经确认的模组专名/模式名，不宣称官方中文名。';}
writeFileSync(p,JSON.stringify(d,null,2)+'\n');console.log(values);
