import crypto from 'crypto';import {db,J,notify} from '@/lib/db';
export async function POST(r){const raw=await r.text();
 if(crypto.createHmac('sha256',process.env.CAL_WEBHOOK_SECRET).update(raw).digest('hex')!==r.headers.get('x-cal-signature-256'))return J({},401);
 const e=JSON.parse(raw),a=e.payload?.attendees?.[0];
 if(a?.email&&e.triggerEvent==='BOOKING_CREATED'){await db.from('leads').update({stage:'call_booked'}).eq('email',a.email);await notify(`Call booked: ${a.name}, ${e.payload.startTime}`)}
 if(a?.email&&e.triggerEvent==='BOOKING_CANCELLED')await db.from('leads').update({stage:'replied'}).eq('email',a.email);
 return J({ok:1})}
