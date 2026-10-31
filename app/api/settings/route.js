import {db,auth,J} from '@/lib/db';
export async function GET(r){if(!auth(r))return J({},401);const p=await db.from('settings').select('value').eq('key','paused').maybeSingle();return J({paused:p.data?.value==='1'})}
export async function POST(r){if(!auth(r))return J({},401);const b=await r.json();await db.from('settings').upsert({key:'paused',value:b.paused?'1':'0'});return J({ok:1})}
