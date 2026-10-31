import fs from 'fs';import path from 'path';
export const brain=(...f)=>f.map(n=>fs.readFileSync(path.join(process.cwd(),'brain',n+'.md'),'utf8')).join('\n\n');
export async function ask(system,user,json=false){
 const r=await fetch(process.env.LLM_BASE_URL+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.LLM_API_KEY},body:JSON.stringify({model:process.env.LLM_MODEL,temperature:0.4,messages:[{role:'system',content:system},{role:'user',content:user}],...(json?{response_format:{type:'json_object'}}:{})})});
 if(!r.ok)throw new Error('LLM '+r.status+': '+(await r.text()).slice(0,200));
 const t=(await r.json()).choices[0].message.content;
 return json?JSON.parse(t.replace(/```json|```/g,'')):t}
