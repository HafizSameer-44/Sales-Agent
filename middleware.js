// ============================================================================
// PASTE AS:  middleware.js   (project root, next to package.json, NOT inside app/)
// Protects every /api route with the logged-in Supabase user.
// Your existing API routes keep working unchanged: this adds the internal key
// they already check, but only after the Supabase login token has been verified.
//
// ENV needed:
//   NEXT_PUBLIC_SUPABASE_URL        your Supabase project URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY   Supabase -> Project Settings -> API -> anon public key
//   APP_PASSCODE                    now an INTERNAL secret: any long random string. Nobody types it any more.
//   ALLOWED_EMAILS                  RECOMMENDED: comma separated emails allowed to use the app
//   CRON_SECRET                     (already set) cron-job.org keeps working
// ============================================================================
import {NextResponse} from 'next/server';

export const config = {matcher: ['/api/((?!webhooks/).*)']};
const cache = new Map();

async function verify(token) {
  const hit = cache.get(token);
  if (hit && hit > Date.now()) return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(url + '/auth/v1/user', {headers: {apikey: key, Authorization: 'Bearer ' + token}});
    if (!r.ok) return false;
    const u = await r.json();
    const allow = (process.env.ALLOWED_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
    if (allow.length && !allow.includes((u.email || '').toLowerCase())) return false;
    if (cache.size > 300) cache.clear();
    cache.set(token, Date.now() + 60000);
    return true;
  } catch { return false; }
}

export async function middleware(req) {
  const h = new Headers(req.headers);
  h.delete('x-passcode'); // never trust this header from the outside
  const auth = h.get('authorization') || '';
  if (process.env.CRON_SECRET && auth === 'Bearer ' + process.env.CRON_SECRET) return NextResponse.next({request: {headers: h}});
  if (!process.env.APP_PASSCODE) return NextResponse.json({error: 'Server setup: add APP_PASSCODE (any long random string) to your environment variables.'}, {status: 500});
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !(await verify(token))) return NextResponse.json({error: 'Please log in again.'}, {status: 401});
  h.set('x-passcode', process.env.APP_PASSCODE);
  return NextResponse.next({request: {headers: h}});
}