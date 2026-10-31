import crypto from 'crypto';import {db,J,notify} from '@/lib/db';
export async function POST(r){const raw=await r.text();
 const h=Object.fromEntries((r.headers.get('stripe-signature')||'').split(',').map(x=>x.split('=')));
 if(crypto.createHmac('sha256',process.env.STRIPE_WEBHOOK_SECRET).update(h.t+'.'+raw).digest('hex')!==h.v1)return J({},401);
 const e=JSON.parse(raw),o=e.data.object;
 if(e.type==='checkout.session.completed'||e.type==='invoice.paid'){
  const amt=(o.amount_total??o.amount_paid)/100,em=o.customer_details?.email||o.customer_email;
  await db.from('payments').insert({amount:amt,currency:o.currency,email:em});
  if(em)await db.from('leads').update({stage:'won'}).eq('email',em);
  await notify(`Payment received: ${amt} ${(o.currency||'').toUpperCase()}`)}
 return J({ok:1})}
