import {db,ok,auth,J,notify} from '@/lib/db';import {ask,brain} from '@/lib/llm';
export async function GET(r){if(!auth(r))return J({},401);return J(ok(await db.from('calls').select('*,leads(name)').order('created_at',{ascending:false}).limit(50)))}
export async function POST(r){if(!auth(r))return J({},401);const b=await r.json();
 const c=await ask(brain('scorecard'),`Grade this call. JSON {"score":0,"verdict":"","summary":["","",""],"good":[""],"fix":[{"issue":"","say_instead":""}],"followup":"","stage":""}\n\n${b.transcript}`,true);
 ok(await db.from('calls').insert({lead_id:b.lead_id||null,score:c.score,result:c}));
 if(b.lead_id&&c.followup)ok(await db.from('drafts').insert({lead_id:b.lead_id,kind:'call',subject:'following up on our call',body:c.followup,why:'Post-call follow-up',status:'pending'}));
 await notify(`Call scored: ${c.score}/100`);return J(c)}
