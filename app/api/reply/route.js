import {db,ok,auth,J,notify} from '@/lib/db';import {ask,brain} from '@/lib/llm';
export async function POST(r){if(!auth(r))return J({},401);const b=await r.json();
 const l=ok(await db.from('leads').select('*').eq('id',b.lead_id).single());
 await db.from('messages').insert({lead_id:l.id,direction:'in',body:b.text});
 await db.from('leads').update({stage:'replied'}).eq('id',l.id);
 await db.from('drafts').update({status:'skipped'}).eq('lead_id',l.id).eq('status','pending');
 const h=ok(await db.from('messages').select('direction,body').eq('lead_id',l.id).order('at')).map(m=>m.direction+': '+m.body).join('\n');
 const d=await ask(brain('agent','business','email'),`Conversation with ${l.name} (${l.company}):\n${h}\n\nDraft my next reply. JSON {"subject":"","body":"","why":""}`,true);
 ok(await db.from('drafts').insert({lead_id:l.id,kind:'reply',subject:d.subject,body:d.body,why:d.why,status:'pending'}));
 await notify(`Reply from ${l.name}: draft ready`);return J({ok:1})}
