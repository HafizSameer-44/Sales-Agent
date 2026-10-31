// ============================================================================
// AI LEAD FINDER API  v2  (single file)  -  finds businesses WITHOUT a website
// REPLACE the file:  app/api/leadfinder/route.js
// Needs your existing lib/db.js (db, ok, auth, J) and lib/llm.js (ask, brain). No new key, no SQL.
//
// Data sources: Geoapify (free key GEOAPIFY_KEY, most reliable) first, then 4 free OpenStreetMap servers raced as backup.
//   - if every source fails, the error shows the exact reasons
//   - no geocoder: city coordinates are built in (one less thing that can fail)
//   - results are cached in your Supabase "settings" table, so repeat searches are instant
//   - no website scraping and no AI call during search, so a search takes seconds
//   - AI is used only when you press "Write email / Write message"
// ============================================================================
import {db, ok, auth, J} from '@/lib/db';
import {ask, brain} from '@/lib/llm';

export const maxDuration = 60;
const UA = {'User-Agent': 'lead-finder/2.0 (' + (process.env.GMAIL_USER || 'contact') + ')', 'Content-Type': 'application/x-www-form-urlencoded'};
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];
const RADIUS = 6000; // meters around the city centre
const OSM = {
  'Real estate': 'office=estate_agent', 'Dentist': 'amenity=dentist', 'Lawyer': 'office=lawyer',
  'Accountant': 'office=accountant', 'Marketing agency': 'office=advertising_agency',
  'IT / Software company': 'office=it', 'Hotel': 'tourism=hotel', 'Clinic': 'amenity=clinic',
  'Restaurant': 'amenity=restaurant', 'Gym': 'leisure=fitness_centre', 'Beauty salon': 'shop=hairdresser',
  'Travel agency': 'shop=travel_agency', 'Pharmacy': 'amenity=pharmacy', 'School': 'amenity=school',
  'Cafe': 'amenity=cafe', 'Car dealer': 'shop=car', 'Insurance': 'office=insurance',
  'Car repair': 'shop=car_repair', 'Bakery': 'shop=bakery', 'Florist': 'shop=florist',
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

export async function GET(r) {
  if (!auth(r)) return J({}, 401);
  return J({apify: !!process.env.APIFY_TOKEN, niches: Object.keys(OSM), countries: Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, Object.keys(v)]))});
}

export async function POST(r) {
  if (!auth(r)) return J({}, 401);
  try {
    const b = await r.json();
    if (b.action === 'search') return J(await search(b));
    if (b.action === 'apify_start') return J(await apifyStart(b));
    if (b.action === 'apify_status') return J(await apifyStatus(b));
    if (b.action === 'apify_import') return J(await apifyImport(b));
    if (b.action === 'draft') return J(await draft(b));
    if (b.action === 'mark') {
      await db.from('leads').update({stage: 'messaged', last_contact: new Date().toISOString()}).eq('id', b.lead_id);
      return J({ok: 1});
    }
    return J({error: 'unknown action'}, 400);
  } catch (e) { return J({error: e.message}, 500); }
}

// ---------- map data: Geoapify (free key, reliable) -> OpenStreetMap servers (backup), cached ----------
const GEO = {
  'Real estate': 'office.estate_agent,service.estate_agent', 'Dentist': 'healthcare.dentist', 'Lawyer': 'office.lawyer',
  'Accountant': 'office.accountant', 'Marketing agency': 'office.advertising_agency', 'IT / Software company': 'office.it',
  'Hotel': 'accommodation.hotel,accommodation.guest_house', 'Clinic': 'healthcare.clinic_or_praxis', 'Restaurant': 'catering.restaurant',
  'Gym': 'sport.fitness', 'Beauty salon': 'service.beauty', 'Travel agency': 'service.travel_agency,office.travel_agent',
  'Pharmacy': 'healthcare.pharmacy', 'School': 'education.school', 'Cafe': 'catering.cafe', 'Car dealer': 'commercial.vehicle',
  'Insurance': 'office.insurance', 'Car repair': 'service.vehicle.repair.car', 'Bakery': 'commercial.food_and_drink.bakery', 'Florist': 'commercial.florist',
};

async function geoItems(niche, country, city, lat, lon) {
  const cats = GEO[niche];
  if (!process.env.GEOAPIFY_KEY || !cats) return null; // not configured or custom industry
  const r = await fetch(`https://api.geoapify.com/v2/places?categories=${cats}&filter=circle:${lon},${lat},${RADIUS}&limit=500&apiKey=${process.env.GEOAPIFY_KEY}`, {signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error('Geoapify ' + r.status + (r.status === 401 || r.status === 403 ? ' (check GEOAPIFY_KEY)' : ''));
  const out = [];
  for (const f of (await r.json()).features || []) {
    const p = f.properties || {}, raw = p.datasource?.raw || {};
    if (!p.name || p.website || p.contact?.website || raw.website || raw['contact:website'] || raw.url) continue; // has a website -> skip
    const phone = p.contact?.phone || p.phone || raw.phone || raw['contact:phone'] || '';
    const email = (p.contact?.email || p.email || raw.email || raw['contact:email'] || '').toLowerCase();
    if (!phone && !email) continue;
    out.push({
      name: p.name, phone, email, address: p.address_line2 || p.formatted || city,
      social: raw['contact:facebook'] || raw['contact:instagram'] || raw.facebook || '',
      hours: !!(p.opening_hours || raw.opening_hours), street: !!p.street, city, country, niche,
    });
  }
  return out;
}

async function overpass(q) {
  let last = [];
  for (let round = 0; round < 1; round++) {
    try {
      return await Promise.any(MIRRORS.map(async u => {
        const r = await fetch(u, {method: 'POST', headers: UA, body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(28000)});
        if (!r.ok) throw new Error(new URL(u).hostname + ' status ' + r.status);
        const j = await r.json();
        if (!Array.isArray(j.elements)) throw new Error(new URL(u).hostname + ' bad response');
        return j.elements;
      }));
    } catch (e) {
      last = (e.errors || [e]).map(x => x.name === 'TimeoutError' ? 'timeout' : x.message);
      await new Promise(res => setTimeout(res, 1500));
    }
  }
  throw new Error('OpenStreetMap servers failed (' + [...new Set(last)].slice(0, 3).join(', ') + ')');
}

async function osmItems(niche, country, city, lat, lon) {
  const tag = OSM[niche];
  const f = tag ? `["${tag.split('=')[0]}"="${tag.split('=')[1]}"]` : `["name"~"${String(niche).replace(/["\\]/g, '')}",i]`;
  const no = '[!"website"][!"contact:website"][!"url"]';
  const a = `(around:${RADIUS},${lat},${lon})`;
  const els = await overpass(`[out:json][timeout:20];(nwr${f}${no}["phone"]${a};nwr${f}${no}["contact:phone"]${a};nwr${f}${no}["email"]${a};nwr${f}${no}["contact:email"]${a};);out tags 200;`);
  const seen = new Set(), items = [];
  for (const el of els) {
    const t = el.tags || {};
    if (!t.name || seen.has(t.name.toLowerCase())) continue;
    seen.add(t.name.toLowerCase());
    items.push({
      name: t.name, phone: t.phone || t['contact:phone'] || '', email: (t.email || t['contact:email'] || '').toLowerCase(),
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city'] || city].filter(Boolean).join(' '),
      social: t['contact:facebook'] || t['contact:instagram'] || t.facebook || '', hours: !!t.opening_hours, street: !!t['addr:street'],
      city, country, niche,
    });
  }
  return items;
}

async function pool(niche, country, city, force) {
  const key = 'pool_' + (niche + '_' + city).replace(/\W/g, '');
  const row = (await db.from('settings').select('value').eq('key', key).maybeSingle()).data?.value;
  let cached = null;
  try { cached = row && JSON.parse(row); } catch { /* ignore */ }
  if (!force && cached?.items?.length && Date.now() - cached.t < 6048e5) return cached.items;
  const [lat, lon] = CITIES[country][city];
  const errs = [];
  let items = null, geoOk = false;
  try { items = await geoItems(niche, country, city, lat, lon); geoOk = items !== null; } catch (e) { errs.push(e.message); }
  if (!items?.length) {
    try { items = await osmItems(niche, country, city, lat, lon); }
    catch (e) { errs.push(e.message); if (geoOk) items = []; else items = null; }
  }
  if (items === null) {
    if (cached?.items?.length) return cached.items; // stale cache is better than an error
    throw new Error('Could not load business data. ' + errs.join(' | ') + '. FIX: add a free GEOAPIFY_KEY (myprojects.geoapify.com, no card) to your env variables and restart. It is far more reliable than the public map servers.');
  }
  if (items.length) await db.from('settings').upsert({key, value: JSON.stringify({t: Date.now(), items: items.slice(0, 200)})});
  return items;
}

// ---------- search: no website, rule-based score, saved instantly -----------
const score = c => Math.min(98, 55 + (c.phone ? 15 : 0) + (c.email ? 15 : 0) + (c.street ? 5 : 0) + (c.hours ? 4 : 0) + (c.social ? 4 : 0) + (c.reviews >= 20 ? 4 : 0) + (c.rating >= 4 ? 3 : 0));
const why = c => ['No website', c.phone && 'phone available', c.email && 'email available', c.reviews && c.reviews + ' Google reviews', c.social && 'has a social page'].filter(Boolean).join(' · ');

async function unsaved(items) {
  const names = items.map(i => i.name), have = new Set();
  for (let i = 0; i < names.length; i += 40) {
    const r = await db.from('leads').select('company').in('company', names.slice(i, i + 40));
    (r.data || []).forEach(x => have.add(x.company));
  }
  return items.filter(i => !have.has(i.name));
}
async function gather(niche, country, names, force) {
  const res = await Promise.allSettled(names.map(c => pool(niche, country, c, force)));
  const items = res.flatMap(x => x.status === 'fulfilled' ? x.value : []);
  if (!items.length) { const bad = res.find(x => x.status === 'rejected'); if (bad) throw bad.reason; }
  return items;
}

async function search({niche, country, city, count}) {
  const C = CITIES[country];
  if (!C) throw new Error('Unknown country');
  if (!niche) throw new Error('Choose an industry');
  count = Math.min(+count || 20, 50);
  const names = city && C[city] ? [city] : Object.keys(C).sort(() => Math.random() - 0.5).slice(0, 3);
  let fresh = await unsaved(await gather(niche, country, names, false));
  if (fresh.length < count) fresh = await unsaved(await gather(niche, country, names, true).catch(() => fresh));
  return save(fresh, niche, country, count, names);
}

async function save(fresh, niche, country, count, names) {
  fresh.sort((a, b) => score(b) - score(a));
  const pick = fresh.slice(0, count);
  if (!pick.length) return {leads: [], pool: 0, cities: names};
  const rows = pick.map(c => ({
    name: c.name, email: c.email || null, company: c.name, score: score(c), signals: ['No website', niche], explanation: why(c), stage: 'new',
    profile: `Category: ${niche}\nLocation: ${c.address || c.city}, ${country}\nWebsite: none\nPhone: ${c.phone}${c.social ? '\nSocial: ' + c.social : ''}${c.maps ? '\nMaps: ' + c.maps : ''}`,
  }));
  let saved = [];
  const bulk = await db.from('leads').insert(rows).select();
  if (!bulk.error) saved = bulk.data;
  else for (const r of rows) { const x = await db.from('leads').insert(r).select().single(); if (!x.error) saved.push(x.data); }
  const by = Object.fromEntries(pick.map(c => [c.name, c]));
  const leads = saved.map(l => ({...l, phone: by[l.name]?.phone || '', address: by[l.name]?.address || '', country, social: by[l.name]?.social || '', maps: by[l.name]?.maps || ''}));
  return {leads, pool: fresh.length, cities: names};
}

// ---------- Apify Google Maps (best quality, needs APIFY_TOKEN) -------------
// The UI starts a run, checks its status every 4 seconds, then imports. No request ever runs long.
const APIFY = 'https://api.apify.com/v2';
const ACTOR = process.env.APIFY_ACTOR || 'compass~crawler-google-places';
async function apifyStart({niche, country, city, count}) {
  if (!process.env.APIFY_TOKEN) throw new Error('APIFY_TOKEN is not set');
  const C = CITIES[country];
  if (!C) throw new Error('Unknown country');
  const list = Object.keys(C);
  const c = city && C[city] ? city : list[Math.floor(Math.random() * list.length)];
  const r = await fetch(`${APIFY}/acts/${ACTOR}/runs?token=${process.env.APIFY_TOKEN}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({searchStringsArray: [String(niche).toLowerCase()], locationQuery: `${c}, ${country}`, maxCrawledPlacesPerSearch: Math.min((+count || 20) * 3, 150), language: 'en', website: 'withoutWebsite', skipClosedPlaces: true}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Apify: ' + (j.error?.message || r.status));
  return {runId: j.data.id, datasetId: j.data.defaultDatasetId, city: c};
}
async function apifyStatus({runId}) {
  const r = await fetch(`${APIFY}/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`);
  const j = await r.json();
  if (!r.ok) throw new Error('Apify: ' + (j.error?.message || r.status));
  return {status: j.data.status};
}
async function apifyImport({datasetId, niche, country, count}) {
  const r = await fetch(`${APIFY}/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}&clean=true&limit=300`);
  const items = await r.json();
  if (!Array.isArray(items)) throw new Error('Apify returned no data');
  const cands = [], seen = new Set();
  for (const p of items) {
    if (!p.title || p.website || seen.has(p.title.toLowerCase())) continue; // skip anything that has a website
    const phone = p.phoneUnformatted || p.phone || '', email = (p.emails?.[0] || '').toLowerCase();
    if (!phone && !email) continue;
    seen.add(p.title.toLowerCase());
    cands.push({name: p.title, phone, email, address: p.address || p.city || '', social: '', hours: !!p.openingHours?.length, street: !!(p.street || p.address),
      rating: p.totalScore || 0, reviews: p.reviewsCount || 0, maps: p.url || '', city: p.city || '', country, niche});
  }
  const names = [...new Set(cands.map(c => c.city).filter(Boolean))].slice(0, 3);
  return save(await unsaved(cands), niche, country, Math.min(+count || 20, 50), names);
}

// ---------- write the outreach (email or WhatsApp/DM text) ------------------
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