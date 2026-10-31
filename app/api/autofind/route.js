// ============================================================================
// AI LEAD FINDER  (single file)
// PASTE AS A NEW FILE:  app/api/autofind/route.js
// Needs your existing  lib/db.js  (db, ok, auth, J, notify)  and  lib/llm.js  (ask, brain)
// ============================================================================
// What it does on every call:
//   1. Picks the next niche + city (USA, Europe, Pakistan rotation) or uses the one you pass
//   2. Finds businesses (provider "osm" = free, no key | "apify" = Apify Google Maps)
//   3. Finds each business's email from its website
//   4. AI scores every lead with brain/icp.md and saves it in the leads table
//   5. For score >= MIN_SCORE with an email, AI writes email 1 into the drafts table
//        AUTO_APPROVE=1  -> status "approved" (your /api/run sends it automatically)
//        otherwise       -> status "pending"  (you approve it in the Approve tab)
//
// ENV (add to .env.local and Vercel, then redeploy):
//   FIND_PROVIDER=osm          (or apify)
//   APIFY_TOKEN=               (only if FIND_PROVIDER=apify)
//   AUTO_APPROVE=1             (optional, fully automatic sending)
//   MIN_SCORE=80               (optional)
//
// RUN IT:
//   Automatic: cron-job.org -> GET https://YOUR-APP/api/autofind every 30 min
//              header  Authorization: Bearer YOUR_CRON_SECRET
//   Manual:    curl -H "x-passcode: YOUR_PASSCODE" "https://YOUR-APP/api/autofind?niche=dentist&city=Berlin,%20Germany"
// ============================================================================
import {db, ok, auth, J, notify} from '@/lib/db';
import {ask, brain} from '@/lib/llm';

export const maxDuration = 60;
export const GET = go;
export const POST = go;

// ---------------------------- EDIT THESE ------------------------------------
const PER_RUN = 15;        // leads per search (keep <= 15 on Vercel free, 60s limit)
const RUNS_PER_DAY = 4;    // automatic searches per day
const REGION_ORDER = ['US', 'EU', 'US', 'EU', 'PK']; // USA and Europe first
const NICHES = ['real estate', 'dentist', 'lawyer', 'marketing agency', 'hotel', 'clinic'];
const CITIES = {
  US: ['New York, USA', 'Austin, USA', 'Miami, USA', 'Chicago, USA', 'Los Angeles, USA', 'Seattle, USA'],
  EU: ['London, UK', 'Berlin, Germany', 'Amsterdam, Netherlands', 'Paris, France', 'Madrid, Spain', 'Dublin, Ireland', 'Stockholm, Sweden'],
  PK: ['Karachi, Pakistan', 'Lahore, Pakistan'],
};
// ----------------------------------------------------------------------------

const PROVIDER = process.env.FIND_PROVIDER || 'osm';
const AUTO_APPROVE = process.env.AUTO_APPROVE === '1';
const MIN_SCORE = +(process.env.MIN_SCORE || 80);
const UA = {'User-Agent': 'lead-finder/1.0 (' + (process.env.GMAIL_USER || 'contact') + ')'};

const getSetting = async k => (await db.from('settings').select('value').eq('key', k).maybeSingle()).data?.value;
const setSetting = async (k, v) => ok(await db.from('settings').upsert({key: k, value: String(v)}));

// ---------- 1. FIND BUSINESSES: OpenStreetMap (free, no key) ----------------
const OSM_TAGS = {
  dentist: 'amenity=dentist', clinic: 'amenity=clinic', hospital: 'amenity=hospital',
  pharmacy: 'amenity=pharmacy', restaurant: 'amenity=restaurant', cafe: 'amenity=cafe',
  school: 'amenity=school', gym: 'leisure=fitness_centre', hotel: 'tourism=hotel',
  salon: 'shop=hairdresser', lawyer: 'office=lawyer', accountant: 'office=accountant',
  'real estate': 'office=estate_agent', 'marketing agency': 'office=advertising_agency',
  'travel agency': 'shop=travel_agency', software: 'office=it',
};
const BAD_EMAIL = /(\.(png|jpe?g|gif|svg|webp|css|js)$)|example\.|sentry|wixpress|noreply|no-reply|@2x/i;

async function findEmail(site) {
  if (!/^https?:/.test(site)) site = 'https://' + site;
  let host;
  try { host = new URL(site).hostname.replace(/^www\./, ''); } catch { return ''; }
  for (const p of ['', '/contact']) {
    try {
      const html = await (await fetch(new URL(p, site), {headers: UA, signal: AbortSignal.timeout(5000)})).text();
      const found = (html.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [])
        .map(x => x.toLowerCase()).filter(x => !BAD_EMAIL.test(x));
      if (found.length) return found.find(x => x.endsWith(host)) || found[0];
    } catch { /* try next page */ }
  }
  return '';
}

async function osmPlaces(niche, city, max) {
  const g = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(city), {headers: UA})).json();
  if (!g[0]) return [];
  const [s, n, w, e] = g[0].boundingbox;
  const tag = OSM_TAGS[niche.toLowerCase()];
  const filter = tag ? `["${tag.split('=')[0]}"="${tag.split('=')[1]}"]` : `["name"~"${niche.replace(/"/g, '')}",i]`;
  const q = `[out:json][timeout:40];nwr${filter}["website"](${s},${w},${n},${e});out tags ${max * 3};`;
  const r = await fetch('https://overpass-api.de/api/interpreter', {method: 'POST', headers: UA, body: 'data=' + encodeURIComponent(q)});
  if (!r.ok) throw new Error('Overpass busy (' + r.status + '), try again in a minute');
  const els = (await r.json()).elements.map(x => x.tags).filter(t => t?.name && (t.website || t['contact:website']));
  const out = [];
  for (let i = 0; i < els.length && out.length < max; i += 8) {
    await Promise.all(els.slice(i, i + 8).map(async t => {
      const site = t.website || t['contact:website'];
      const em = t.email || t['contact:email'] || await findEmail(site);
      out.push({
        title: t.name, categoryName: niche, website: site, phone: t.phone || t['contact:phone'],
        address: [t['addr:street'], t['addr:city'] || city].filter(Boolean).join(', '), emails: em ? [em] : [],
      });
    }));
  }
  return out.slice(0, max);
}

// ---------- 1b. FIND BUSINESSES: Apify Google Maps (needs APIFY_TOKEN) ------
const AP = 'https://api.apify.com/v2';
async function apifyStart(niche, city, max) {
  const r = await fetch(`${AP}/acts/compass~crawler-google-places/runs?token=${process.env.APIFY_TOKEN}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({searchStringsArray: [niche], locationQuery: city, maxCrawledPlacesPerSearch: Math.min(max, 50), scrapeContacts: true, language: 'en'}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Apify: ' + (j.error?.message || r.status));
  await setSetting('apifyrun_' + j.data.id, j.data.defaultDatasetId);
  return `Apify search started: ${niche} in ${city} (results import automatically on a later call)`;
}
async function apifyImportFinished() {
  const out = [];
  const rows = ok(await db.from('settings').select('*').like('key', 'apifyrun_%'));
  for (const s of rows) {
    const id = s.key.slice(9);
    const st = (await (await fetch(`${AP}/actor-runs/${id}?token=${process.env.APIFY_TOKEN}`)).json()).data?.status;
    if (['RUNNING', 'READY'].includes(st)) { out.push('Apify run still running'); continue; }
    await db.from('settings').delete().eq('key', s.key);
    if (st !== 'SUCCEEDED') { out.push('Apify run ' + st); continue; }
    const items = await (await fetch(`${AP}/datasets/${s.value}/items?token=${process.env.APIFY_TOKEN}&clean=true`)).json();
    out.push(await importPlaces(items));
  }
  return out;
}

// ---------- 2. SCORE + SAVE + DRAFT EMAIL ------------------------------------
async function importPlaces(items) {
  let n = 0, hot = 0, err = '';
  for (let i = 0; i < items.length; i += 5) {
    await Promise.all(items.slice(i, i + 5).map(async p => {
      try {
        const name = p.title;
        if (!name) return;
        const email = (p.emails?.[0] || p.contactInfo?.emails?.[0] || p.companyContacts?.emails?.[0] || '').toLowerCase() || null;
        if ((await db.from('leads').select('id').eq('company', name).limit(1)).data?.length) return;
        if (email && (await db.from('leads').select('id').eq('email', email).limit(1)).data?.length) return;
        const profile = `Category: ${p.categoryName}\nAddress: ${p.address}\nWebsite: ${p.website || 'none'}\nPhone: ${p.phone || ''}\nRating: ${p.totalScore ?? 'n/a'} (${p.reviewsCount ?? 0} reviews)\nEmail found: ${email || 'no'}`;
        const s = await ask(brain('agent', 'icp'),
          `Score this business as a lead for my service. Prefer USA and Europe. JSON {"score":0,"signals":["..."],"explanation":"one line"}.\n${name}\n${profile}`, true);
        const l = ok(await db.from('leads').insert({
          name, email, company: name, profile, score: s.score, signals: s.signals, explanation: s.explanation,
          stage: s.score >= MIN_SCORE ? 'new' : s.score >= 60 ? 'nurture' : 'skipped',
        }).select().single());
        n++;
        if (s.score >= MIN_SCORE && email) {
          const d = await ask(brain('agent', 'business', 'email'),
            `Write email 1 to the team at ${name} (no personal name known, greet them as "Hi team"). Signals: ${JSON.stringify(s.signals)}. Details: ${profile}. JSON {"subject":"","body":"","why":""}`, true);
          ok(await db.from('drafts').insert({lead_id: l.id, kind: 'first', subject: d.subject, body: d.body, why: d.why, status: AUTO_APPROVE ? 'approved' : 'pending'}));
          hot++;
        }
      } catch (e) { err = e.message; }
    }));
  }
  await notify(`Lead finder: ${n} new leads, ${hot} emails ${AUTO_APPROVE ? 'queued to send' : 'waiting for approval'}`);
  return `imported ${n} leads, ${hot} drafts${err ? ' (last error: ' + err + ')' : ''}`;
}

async function search(niche, city) {
  if (PROVIDER === 'apify') return apifyStart(niche, city, PER_RUN);
  return `${niche} in ${city}: ` + await importPlaces(await osmPlaces(niche, city, PER_RUN));
}

// ---------- 3. ENTRY POINT ---------------------------------------------------
async function go(r) {
  if (!auth(r)) return J({}, 401);
  if ((await getSetting('paused')) === '1') return J({r: 'paused'});
  const u = new URL(r.url);
  let b = {};
  if (r.method === 'POST') { try { b = await r.json(); } catch { /* no body */ } }
  const niche = b.niche || u.searchParams.get('niche');
  const city = b.city || u.searchParams.get('city');
  const log = [];
  try {
    if (PROVIDER === 'apify') log.push(...await apifyImportFinished());
    if (niche && city) {
      log.push(await search(niche, city));            // manual search
    } else {                                           // automatic rotation
      const today = new Date().toISOString().slice(0, 10);
      const [d, c] = ((await getSetting('find_today')) || '').split(':');
      const done = d === today ? +c : 0;
      if (done >= RUNS_PER_DAY) { log.push(`daily searches done (${done}/${RUNS_PER_DAY})`); }
      else {
        const idx = +((await getSetting('find_idx')) || 0);
        const region = REGION_ORDER[idx % REGION_ORDER.length];
        const cities = CITIES[region];
        const nextCity = cities[Math.floor(idx / REGION_ORDER.length) % cities.length];
        const nextNiche = NICHES[idx % NICHES.length];
        await setSetting('find_today', today + ':' + (done + 1));
        await setSetting('find_idx', idx + 1);
        log.push(await search(nextNiche, nextCity));
      }
    }
  } catch (e) { log.push('error: ' + e.message); }
  return J({r: log});
}