import {createClient} from '@supabase/supabase-js';
export const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY);
export const ok=r=>{if(r.error)throw new Error(r.error.message);return r.data};
export const auth=r=>r.headers.get('x-passcode')===process.env.APP_PASSCODE||r.headers.get('authorization')==='Bearer '+process.env.CRON_SECRET;
export const J=(d,s=200)=>Response.json(d,{status:s});
export async function notify(text){if(!process.env.TG_TOKEN)return;await fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:process.env.TG_CHAT,text})}).catch(()=>{})}
