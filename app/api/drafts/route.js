import {db,ok,auth,J} from '@/lib/db';import {sendDraft} from '@/lib/mail';
export async function GET(r){if(!auth(r))return J({},401);return J(ok(await db.from('drafts').select('*,leads(name,company,email,score)').eq('status','pending').order('created_at')))}
export async function POST(r){if(!auth(r))return J({},401);const {id,action,body,subject}=await r.json();
 if(action==='skip'){await db.from('drafts').update({status:'skipped'}).eq('id',id);return J({r:'skipped'})}
 await db.from('drafts').update({status:'approved',...(body&&{body}),...(subject&&{subject})}).eq('id',id);
 try{return J({r:await sendDraft(id)})}catch(e){return J({r:'send failed: '+e.message})}}
