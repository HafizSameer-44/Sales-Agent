import {db,ok,auth,J,notify} from '@/lib/db';import {ask,brain} from '@/lib/llm';
export async function GET(r){if(!auth(r))return J({},401);return J(ok(await db.from('leads').select('*').order('created_at',{ascending:false}).limit(200)))}
export async function POST(r){if(!auth(r))return J({},401);const b=await r.json();
 const s=await ask(brain('agent','icp'),`Score this lead. JSON {"score":0,"signals":["..."],"explanation":"one line"}.\nName: ${b.name}\nCompany: ${b.company}\n${b.profile}`,true);
 const l=ok(await db.from('leads').insert({name:b.name,email:b.email||null,company:b.company,profile:b.profile,score:s.score,signals:s.signals,explanation:s.explanation,stage:s.score>=80?'new':s.score>=60?'nurture':'skipped'}).select().single());
 if(s.score>=80&&l.email){
  const d=await ask(brain('agent','business','email'),`Write email 1 to ${l.name} at ${l.company}. Signals: ${JSON.stringify(l.signals)}. Profile: ${l.profile}. JSON {"subject":"","body":"","why":""}`,true);
  ok(await db.from('drafts').insert({lead_id:l.id,kind:'first',subject:d.subject,body:d.body,why:d.why,status:'pending'}));await notify(`Draft ready for ${l.name}`)}
 return J(l)}
