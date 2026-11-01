// ============================================================================
// AI LEAD FINDER API  v3   -  businesses WITHOUT a website, with phone, email (when it exists) and Google Maps link
// REPLACE the file:  app/api/leadfinder/route.js
// Needs your existing lib/db.js (db, ok, auth, J) and lib/llm.js (ask, brain). No SQL needed.
//
// API keys are read from your .env.local (and Vercel env vars) - never paste a key into code.
// DATA SOURCES (add at least one key in .env.local and Vercel, then restart/redeploy):
//   APIFY_TOKEN=...      Google Maps data via Apify. Best quality: real Google listings with "no website", phone, reviews, map URL.
//                        Free plan: $5 credit every month (apify.com -> Settings -> API & integrations).
//   GEOAPIFY_KEY=...     Free backup (geoapify.com, no card). Map data (OpenStreetMap based). Contact details are sparser.
//   APIFY_ACTOR=...      optional, default compass~crawler-google-places
// The unreliable public Overpass servers are NOT used any more.
// ============================================================================
import {db, ok, auth, J, notify} from '@/lib/db';
import {ask, brain} from '@/lib/llm';

export const maxDuration = 60;
const RADIUS = 6000; // meters around the city centre (Geoapify)
const APIFY = 'https://api.apify.com/v2';
const ACTOR = process.env.APIFY_ACTOR || 'compass~crawler-google-places';

// Industry -> Geoapify categories (Apify accepts any industry text)
const GEO = {
  'Real estate': 'office.estate_agent,service.estate_agent', 'Dentist': 'healthcare.dentist', 'Lawyer': 'office.lawyer',
  'Accountant': 'office.accountant', 'Marketing agency': 'office.advertising_agency', 'IT / Software company': 'office.it',
  'Hotel': 'accommodation.hotel,accommodation.guest_house', 'Clinic': 'healthcare.clinic_or_praxis', 'Restaurant': 'catering.restaurant',
  'Gym': 'sport.fitness', 'Beauty salon': 'service.beauty', 'Travel agency': 'service.travel_agency,office.travel_agent',
  'Pharmacy': 'healthcare.pharmacy', 'School': 'education.school', 'Cafe': 'catering.cafe', 'Car dealer': 'commercial.vehicle',
  'Insurance': 'office.insurance', 'Car repair': 'service.vehicle.repair.car', 'Bakery': 'commercial.food_and_drink.bakery', 'Florist': 'commercial.florist',
};
const CITIES = {
  'United States': {'New York': [40.7128, -74.006], 'Los Angeles': [34.0522, -118.2437], 'Chicago': [41.8781, -87.6298], 'Houston': [29.7604, -95.3698], 'Miami': [25.7617, -80.1918], 'Austin': [30.2672, -97.7431], 'Seattle': [47.6062, -122.3321], 'San Francisco': [37.7749, -122.4194], 'Boston': [42.3601, -71.0589], 'Dallas': [32.7767, -96.797]},
  'United Kingdom': {'London': [51.5074, -0.1278], 'Manchester': [53.4808, -2.2426], 'Birmingham': [52.4862, -1.8904], 'Leeds': [53.8008, -1.5491], 'Glasgow': [55.8642, -4.2518]},
  'Germany': {'Berlin': [52.52, 13.405], 'Munich': [48.1351, 11.582], 'Hamburg': [53.5511, 9.9937], 'Frankfurt': [50.1109, 8.6821], 'Cologne': [50.9375, 6.9603]},
  'France': {'Paris': [48.8566, 2.3522], 'Lyon': [45.764, 4.8357], 'Marseille': [43.2965, 5.3698], 'Toulouse': [43.6047, 1.4442]},
  'Spain': {'Madrid': [40.4168, -3.7038], 'Barcelona': [41.3874, 2.1686], 'Valencia': [39.4699, -0.3763], 'Seville': [37.3891, -5.9845]},
  'Italy': {'Milan': [45.4642, 9.19], 'Rome': [41.9028, 12.4964], 'Turin': [45.0703, 7.6869], 'Naples': [40.8518, 14.2681]},
  'Netherlands': {'Amsterdam': [52.3676, 4.9041], 'Rotterdam': [51.9244, 4.4777], 'Utrecht': [52.0907, 5.1214], 'The Hague': [52.0705, 4.3007]},
  'Ireland': {'Dublin': [53.3498, -6.2603], 'Cork': [51.8985, -8.4756], 'Galway': [53.2707, -9.0568]},
  'Sweden': {'Stockholm': [59.3293, 18.0686], 'Gothenburg': [57.7089, 11.9746], 'Malmo': [55.605, 13.0038]},
  'Poland': {'Warsaw': [52.2297, 21.0122], 'Krakow': [50.0647, 19.945], 'Wroclaw': [51.1079, 17.0385]},
  'Portugal': {'Lisbon': [38.7223, -9.1393], 'Porto': [41.1579, -8.6291]},
  'Belgium': {'Brussels': [50.8503, 4.3517], 'Antwerp': [51.2194, 4.4025]},
  'Switzerland': {'Zurich': [47.3769, 8.5417], 'Geneva': [46.2044, 6.1432]},
  'Austria': {'Vienna': [48.2082, 16.3738], 'Salzburg': [47.8095, 13.055]},
  'Denmark': {'Copenhagen': [55.6761, 12.5683], 'Aarhus': [56.1629, 10.2039]},
  'Canada': {'Toronto': [43.6532, -79.3832], 'Vancouver': [49.2827, -123.1207], 'Montreal': [45.5017, -73.5673]},
  'United Arab Emirates': {'Dubai': [25.2048, 55.2708], 'Abu Dhabi': [24.4539, 54.3773]},
  'Pakistan': {'Karachi': [24.8607, 67.0011], 'Lahore': [31.5204, 74.3587], 'Islamabad': [33.6844, 73.0479]},
};

const mapsSearch = (name, addr) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((name + ' ' + (addr || '')).trim());
const friendly = m => /hard limit|usage limit|exceeded|payment|402/i.test(m)
  ? 'Your Apify credit for this month is finished. Wait for the monthly reset or add credit in Apify.'
  : /\b(401|403)\b|unauthor|invalid token|user was not found/i.test(m)
    ? 'The API key was rejected. Check APIFY_TOKEN or GEOAPIFY_KEY in your environment variables, then restart.'
    : m;

export async function GET(r) {
  if (!auth(r)) return J({}, 401);
  return J({
    apify: !!process.env.APIFY_TOKEN, geo: !!process.env.GEOAPIFY_KEY, niches: Object.keys(GEO),
    countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)])),
  });
}

export async function POST(r) {
  if (!auth(r)) return J({}, 401);
  try {
    const b = await r.json();
    const act = {search, apify_start: apifyStart, apify_status: apifyStatus, apify_import: apifyImport, check, draft, mark, add_lead: addLead, delete_leads: delLeads}[b.action];
    if (!act) return J({error: 'Unknown action'}, 400);
    return J(await act(b));
  } catch (e) { return J({error: friendly(e.message || 'Something went wrong')}, 500); }
}

// ---------- scoring + saving (shared) ---------------------------------------
const SOCIAL = /(facebook|instagram|linktr\.ee|wa\.me|tiktok|youtube|twitter|x\.com|linkedin|business\.site)/i;
const noSite = c => !c.site || SOCIAL.test(c.site); // no website, or only a social page
const score = c => Math.min(99, 50 + (noSite(c) ? 10 : 0) + (c.phone ? 15 : 0) + (c.email ? 20 : 0) + (c.street ? 5 : 0) + (c.hours ? 3 : 0) + (c.reviews >= 20 ? 4 : 0) + (c.rating >= 4 ? 3 : 0));
const why = c => [!c.site ? 'No website' : noSite(c) ? 'Social page only' : 'Has website', c.phone && 'phone', c.email && 'email', c.reviews && c.reviews + ' Google reviews'].filter(Boolean).join(' · ');

async function unsaved(items) {
  const have = new Set(), emails = new Set();
  const names = items.map(i => i.name);
  for (let i = 0; i < names.length; i += 40) {
    const r = await db.from('leads').select('company,email').in('company', names.slice(i, i + 40));
    (r.data || []).forEach(x => { have.add(x.company); if (x.email) emails.add(x.email); });
  }
  return items.filter(i => !have.has(i.name) && !(i.email && emails.has(i.email)));
}

async function save(fresh, niche, country, count, names) {
  // order: no website first, then has email, then score
  fresh.sort((a, b) => (noSite(b) ? 1 : 0) - (noSite(a) ? 1 : 0) || (b.email ? 1 : 0) - (a.email ? 1 : 0) || score(b) - score(a));
  const pick = fresh.slice(0, count);
  if (!pick.length) return {leads: [], pool: 0, cities: names};
  const rows = pick.map(c => ({
    name: c.name, email: c.email || null, company: c.name, score: score(c), signals: noSite(c) ? ['Finder', 'No website', niche] : ['Finder', niche], explanation: why(c), stage: 'new',
    profile: `Category: ${niche}\nLocation: ${c.address || c.city}, ${country}\nWebsite: ${c.site || 'none'}\nPhone: ${c.phone}\nMaps: ${c.maps || mapsSearch(c.name, c.address || c.city)}`,
  }));
  let saved = [];
  const bulk = await db.from('leads').insert(rows).select();
  if (!bulk.error) saved = bulk.data;
  else for (const row of rows) { const x = await db.from('leads').insert(row).select().single(); if (!x.error) saved.push(x.data); }
  if (saved.length) await notify(`Lead finder: ${saved.length} new leads (${saved.filter(l => l.email).length} with email, ${pick.filter(noSite).length} without a website)`);
  return {leads: saved, pool: fresh.length, cities: names};
}

// ---------- SOURCE 1: Apify Google Maps (UI starts a run, polls, then imports) --
async function apifyStart({niche, country, city, count, mode}) {
  if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');
  const C = CITIES[country];
  if (!C) throw new Error('Unknown country');
  if (!niche) throw new Error('Choose an industry');
  const list = Object.keys(C);
  const c = city && C[city] ? city : list[Math.floor(Math.random() * list.length)];
  const r = await fetch(`${APIFY}/acts/${ACTOR}/runs?token=${process.env.APIFY_TOKEN}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({searchStringsArray: [String(niche).toLowerCase()], locationQuery: `${c}, ${country}`, maxCrawledPlacesPerSearch: Math.min((+count || 20) * 3, 150), language: 'en', skipClosedPlaces: true, ...(mode === 'strict' ? {website: 'withoutWebsite'} : {website: 'allPlaces', scrapeContacts: true})}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Apify ' + r.status + ': ' + (j.error?.message || 'could not start'));
  return {runId: j.data.id, datasetId: j.data.defaultDatasetId, city: c};
}
async function apifyStatus({runId}) {
  const r = await fetch(`${APIFY}/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Apify ' + r.status + ': ' + (j.error?.message || 'status check failed'));
  return {status: j.data.status};
}
async function apifyImport({datasetId, niche, country, count, mode}) {
  const r = await fetch(`${APIFY}/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}&clean=true&limit=300`);
  const items = await r.json().catch(() => null);
  if (!Array.isArray(items)) throw new Error('Apify returned no data');
  const cands = [], seen = new Set();
  for (const p of items) {
    if (!p.title || seen.has(p.title.toLowerCase())) continue;
    const site = String(p.website || '');
    if (mode === 'strict' && site) continue; // strict: never keep a place that has a website
    const phone = p.phoneUnformatted || p.phone || '';
    const email = [].concat(p.emails || []).map(String).find(x => x.includes('@'))?.toLowerCase() || '';
    if (!phone && !email) continue;
    seen.add(p.title.toLowerCase());
    cands.push({name: p.title, site, phone, email, address: p.address || p.city || '', hours: !!p.openingHours?.length, street: !!(p.street || p.address),
      rating: p.totalScore || 0, reviews: p.reviewsCount || 0, maps: p.url || '', city: p.city || '', country, niche});
  }
  const names = [...new Set(cands.map(c => c.city).filter(Boolean))].slice(0, 3);
  return save(await unsaved(cands), niche, country, Math.min(+count || 20, 50), names);
}

// ---------- SOURCE 2: Geoapify (free key), cached 7 days --------------------
async function pool(niche, country, city) {
  const key = 'pool_' + (niche + '_' + city).replace(/\W/g, '');
  const row = (await db.from('settings').select('value').eq('key', key).maybeSingle()).data?.value;
  let cached = null;
  try { cached = row && JSON.parse(row); } catch { /* ignore */ }
  if (cached?.items?.length && Date.now() - cached.t < 6048e5) return cached.items;
  const [lat, lon] = CITIES[country][city];
  try {
    const r = await fetch(`https://api.geoapify.com/v2/places?categories=${GEO[niche]}&filter=circle:${lon},${lat},${RADIUS}&limit=500&apiKey=${process.env.GEOAPIFY_KEY}`, {signal: AbortSignal.timeout(25000)});
    if (!r.ok) throw new Error('Geoapify ' + r.status);
    const items = [];
    for (const f of (await r.json()).features || []) {
      const p = f.properties || {}, raw = p.datasource?.raw || {};
      if (!p.name || p.website || p.contact?.website || raw.website || raw['contact:website'] || raw.url) continue;
      const phone = p.contact?.phone || p.phone || raw.phone || raw['contact:phone'] || '';
      const email = (p.contact?.email || p.email || raw.email || raw['contact:email'] || '').toLowerCase();
      if (!phone && !email) continue;
      items.push({name: p.name, phone, email, address: p.address_line2 || p.formatted || city, hours: !!(p.opening_hours || raw.opening_hours), street: !!p.street, city, country, niche});
    }
    if (items.length) await db.from('settings').upsert({key, value: JSON.stringify({t: Date.now(), items: items.slice(0, 250)})});
    return items;
  } catch (e) {
    if (cached?.items?.length) return cached.items;
    throw e;
  }
}
async function search({niche, country, city, count}) {
  if (!process.env.GEOAPIFY_KEY) throw new Error('GEOAPIFY_KEY is not set');
  const C = CITIES[country];
  if (!C) throw new Error('Unknown country');
  if (!GEO[niche]) throw new Error('Custom industries work with the Apify source only. Pick a listed industry.');
  const names = city && C[city] ? [city] : Object.keys(C).sort(() => Math.random() - 0.5).slice(0, 3);
  const res = await Promise.allSettled(names.map(c => pool(niche, country, c)));
  const items = res.flatMap(x => x.status === 'fulfilled' ? x.value : []);
  const bad = res.find(x => x.status === 'rejected');
  if (!items.length && bad) throw bad.reason;
  return save(await unsaved(items), niche, country, Math.min(+count || 20, 50), names);
}

// ---------- connection test (shown in the UI) -------------------------------
async function check() {
  const out = {apify: {set: !!process.env.APIFY_TOKEN}, geo: {set: !!process.env.GEOAPIFY_KEY}};
  if (out.apify.set) {
    try {
      const r = await fetch(`${APIFY}/users/me?token=${process.env.APIFY_TOKEN}`);
      const j = await r.json().catch(() => ({}));
      out.apify.ok = r.ok; out.apify.user = j.data?.username || '';
      if (r.ok) {
        try {
          const l = await (await fetch(`${APIFY}/users/me/limits?token=${process.env.APIFY_TOKEN}`)).json();
          out.apify.used = l.data?.current?.monthlyUsageUsd; out.apify.max = l.data?.limits?.maxMonthlyUsageUsd;
        } catch { /* usage numbers are optional */ }
      }
    } catch { out.apify.ok = false; }
  }
  if (out.geo.set) {
    try { out.geo.ok = (await fetch(`https://api.geoapify.com/v1/geocode/search?text=Berlin&limit=1&apiKey=${process.env.GEOAPIFY_KEY}`)).ok; }
    catch { out.geo.ok = false; }
  }
  return out;
}

// ---------- manage leads: add / delete / mark -------------------------------
async function addLead(b) {
  const name = (b.name || '').trim(), phone = (b.phone || '').trim(), email = (b.email || '').trim().toLowerCase() || null, address = (b.address || '').trim();
  if (!name) throw new Error('Business name is required');
  if (!phone && !email) throw new Error('Add a phone number or an email');
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That email address looks invalid');
  const c = {phone, email, street: !!address};
  const x = await db.from('leads').insert({
    name, email, company: name, score: score(c), signals: ['Finder', 'Manual'], explanation: 'Added manually', stage: 'new',
    profile: `Category: ${(b.niche || 'n/a').trim()}\nLocation: ${address}\nWebsite: none\nPhone: ${phone}\nMaps: ${(b.maps || '').trim() || mapsSearch(name, address)}`,
  }).select().single();
  if (x.error) throw new Error(/duplicate|unique/i.test(x.error.message) ? 'A lead with this email already exists' : x.error.message);
  return {lead: x.data};
}
async function delLeads({ids}) {
  if (!Array.isArray(ids) || !ids.length) throw new Error('Nothing selected');
  await db.from('drafts').delete().in('lead_id', ids);
  await db.from('messages').delete().in('lead_id', ids);
  ok(await db.from('leads').delete().in('id', ids));
  return {deleted: ids.length};
}
async function mark({lead_id}) {
  await db.from('leads').update({stage: 'messaged', last_contact: new Date().toISOString()}).eq('id', lead_id);
  return {ok: 1};
}

// ---------- outreach: email draft or WhatsApp text --------------------------
async function draft({lead_ids, channel}) {
  const out = [];
  for (let i = 0; i < lead_ids.length; i += 3) {
    await Promise.all(lead_ids.slice(i, i + 3).map(async id => {
      const l = ok(await db.from('leads').select('*').eq('id', id).single());
      if (channel !== 'message') {
        const old = await db.from('drafts').select('id,subject,body').eq('lead_id', id).eq('status', 'pending').limit(1);
        if (old.data?.length) { out.push({lead_id: id, ...old.data[0]}); return; }
        const d = await ask(brain('agent', 'business', 'email'),
          `Write email 1 to the team at ${l.name}. They have NO website, so offer to build them a professional website that brings in customers (use my business file for what I offer and real proof, never invent results). Greet "Hi team". Mention one real detail (their industry or city). Details:\n${l.profile}\nJSON {"subject":"","body":"","why":""}`, true);
        const r = ok(await db.from('drafts').insert({lead_id: id, kind: 'first', subject: d.subject, body: d.body, why: d.why, status: 'pending'}).select().single());
        out.push({lead_id: id, id: r.id, subject: r.subject, body: r.body});
      } else {
        const d = await ask(brain('agent', 'business'),
          `Write a short friendly WhatsApp message (max 60 words) to the owner of ${l.name}. They have NO website, so offer a professional website that brings in customers. One real detail, one question at the end, no links, no hype. Details:\n${l.profile}\nJSON {"body":""}`, true);
        out.push({lead_id: id, body: d.body});
      }
    }));
  }
  return {drafts: out};
}