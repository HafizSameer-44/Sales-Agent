import {db,ok,auth,J,notify} from '@/lib/db';import {sendDraft} from '@/lib/mail';import {ask,brain} from '@/lib/llm';
export const maxDuration=60;
export const GET=run;export const POST=run;
async function run(r){if(!auth(r))return J({},401);
 const p=await db.from('settings').select('value').eq('key','paused').maybeSingle();if(p.data?.value==='1')return J({r:'paused'});
 const out={sent:0,followups:0};
 for(const d of ok(await db.from('drafts').select('id').eq('status','approved'))){if(await sendDraft(d.id)!=='sent')break;out.sent++}
 const gaps=[3,4,7];
 for(const l of ok(await db.from('leads').select('*').eq('stage','contacted').lt('step',3))){
  if(Date.now()-new Date(l.last_contact)<gaps[l.step]*864e5)continue;
  const {count}=await db.from('drafts').select('*',{count:'exact',head:true}).eq('lead_id',l.id).eq('status','pending');if(count)continue;
  const d=await ask(brain('agent','business','email'),`Write follow-up #${l.step+1} of 3 to ${l.name} at ${l.company} using the follow-up rules. Signals: ${JSON.stringify(l.signals)}. JSON {"subject":"","body":"","why":""}`,true);
  ok(await db.from('drafts').insert({lead_id:l.id,kind:'followup',subject:d.subject,body:d.body,why:d.why,status:'pending'}));out.followups++}
 const t=new Date(new Date().toLocaleString('en-US',{timeZone:process.env.TZ_NAME||'Asia/Karachi'}));
 if([8,18].includes(t.getHours())&&t.getMinutes()<15){const n=async s=>(await db.from('drafts').select('*',{count:'exact',head:true}).eq('status',s)).count;await notify(`${t.getHours()==8?'Morning':'Evening'}: ${await n('pending')} drafts waiting, ${await n('sent')} emails sent in total`)}
 return J(out)}
