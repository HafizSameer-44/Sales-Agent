import nodemailer from 'nodemailer';import {db,ok} from './db';
export function inWindow(){return true}
export async function sendDraft(id){
 const p=await db.from('settings').select('value').eq('key','paused').maybeSingle();
 if(p.data?.value==='1')return 'paused';
 if(!inWindow())return 'outside sending window (will send automatically)';
 const {count}=await db.from('drafts').select('*',{count:'exact',head:true}).eq('status','sent').gte('sent_at',new Date(Date.now()-864e5).toISOString());
 if(count>=+(process.env.DAILY_EMAIL_LIMIT||10))return 'daily limit reached';
 const d=ok(await db.from('drafts').select('*,leads(*)').eq('id',id).single());
 if(!d.leads.email)return 'lead has no email';
 await nodemailer.createTransport({service:'gmail',auth:{user:process.env.GMAIL_USER,pass:process.env.GMAIL_APP_PASSWORD}}).sendMail({from:process.env.GMAIL_USER,to:d.leads.email,subject:d.subject,text:d.body});
 const now=new Date().toISOString();
 await db.from('drafts').update({status:'sent',sent_at:now}).eq('id',id);
 await db.from('messages').insert({lead_id:d.lead_id,direction:'out',body:d.body});
 await db.from('leads').update({stage:'contacted',last_contact:now,step:d.kind==='followup'?d.leads.step+1:d.leads.step}).eq('id',d.lead_id).in('stage',['new','contacted']);
 return 'sent'}
