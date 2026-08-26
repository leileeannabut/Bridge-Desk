#!/usr/bin/env node
/**
 * run.js — job scraper for BridgeDesk
 * ---------------------------------------------------------------------------
 * Pulls open Virtual Assistant / Executive Assistant / Personal Assistant /
 * Legal Assistant roles from startup career pages worldwide and writes
 * site/jobs.json beside site/index.html, which the page reads directly. No
 * database. Nothing is dropped for being outside the US — every posting is
 * tagged with a region instead, and the board filters on that.
 *
 *   node run.js                          # every company with a known method
 *   node run.js --hub=startup            # one hub (only one exists today)
 *   node run.js --only=checkr            # one company
 *   node run.js --dry                    # scrape, print, write nothing
 *   node run.js --out=site/jobs.json     # default
 *
 * THE RULE, INHERITED FROM THE ORIGINAL SCRAPER: a source that fails is logged
 * as an error. It never contributes invented or stale rows. If a source fails
 * mid-run, its previously-seen jobs are carried over from the existing feed
 * rather than silently disappearing — a scrape failure is not evidence that a
 * company stopped hiring.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { COMPANIES } from './config.js';

/* ---- options -------------------------------------------------------------- */
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const OUT = args.out || 'site/jobs.json';
const TIMEOUT_MS = 20000;
const CONCURRENCY = 4;          // polite: four career sites at a time, not 123
const DELAY_MS = 350;           // between batches
const UA = 'BridgeDeskBot/1.0 (+https://bridgedesk.co)';

/* ---- helpers -------------------------------------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  return fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json, text/html', ...opts.headers },
    redirect: 'follow',
    signal: ctl.signal,
  }).finally(() => clearTimeout(timer));
}

/** Strip HTML to readable text — descriptions arrive as markup from every ATS. */
/**
 * HTML to readable text.
 *
 * Greenhouse and some Workday tenants return content that is HTML-ESCAPED —
 * `&lt;p&gt;` rather than `<p>`. Stripping tags before decoding entities would
 * leave those escaped tags behind as visible text, which is exactly what
 * happened. So: decode first, strip second, and repeat while the string keeps
 * changing to catch double-escaping.
 */
function decodeEntities(s) {
  return String(s)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&ndash;|&#8211;/gi, '–')
    .replace(/&mdash;|&#8212;/gi, '—')
    .replace(/&hellip;|&#8230;/gi, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/gi, '&');          // last, or it re-creates other entities
}

function stripTags(s) {
  return String(s)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '');
}

function toText(html) {
  if (!html) return '';
  let s = String(html);

  // Alternate decode/strip until it settles. Two passes handles the normal
  // double-escaped case; the cap stops a pathological input looping.
  for (let i = 0; i < 4; i++) {
    const before = s;
    s = stripTags(decodeEntities(s));
    if (s === before) break;
  }

  return s
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** First couple of sentences, for the card. */
function summarise(text, max = 180) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
  return (stop > 80 ? cut.slice(0, stop + 1) : cut.trimEnd() + '…');
}

/**
 * Compensation, when a posting states it. Deliberately conservative: a wrong
 * salary is worse than none, so anything ambiguous returns nulls.
 */
function parseComp(text) {
  if (!text) return { min: null, max: null };
  const t = String(text);

  // Capture the WHOLE digit run, then decide the scale. An earlier version let
  // \d{2,3} match greedily, so "$70,000" came through as 700 with no suffix and
  // was scaled to $700,000 — a tenfold error on a salary is worse than showing
  // nothing at all.
  const m = t.match(/\$\s*(\d[\d,]*(?:\.\d+)?)\s*([kK])?\s*(?:-|–|—|to|through)\s*\$?\s*(\d[\d,]*(?:\.\d+)?)\s*([kK])?/);
  if (!m) return { min: null, max: null };

  const scale = (digits, suffix) => {
    const n = parseFloat(String(digits).replace(/,/g, ''));
    if (!Number.isFinite(n)) return null;
    if (suffix) return Math.round(n * 1000);          // "$145k"
    if (n < 1000) return Math.round(n * 1000);        // "$145" meaning 145k
    return Math.round(n);                             // "$145,000"
  };

  const min = scale(m[1], m[2]);
  const max = scale(m[3], m[4]);

  // Sanity: real annual salaries, the right way round. Hourly rates and
  // typos are rejected rather than guessed at.
  if (min == null || max == null) return { min: null, max: null };
  if (min < 20000 || max > 1000000 || min > max) return { min: null, max: null };
  return { min, max };
}

/**
 * Which role family a posting belongs to. BridgeDesk only wants assistant-
 * type roles, so this doubles as the relevance filter: anything that comes
 * back 'Other' gets dropped downstream rather than shown as a category.
 */
function categorise(title = '') {
  const t = title.toLowerCase();

  // Titles that contain "assistant" but are not assistant roles. Checked first
  // so "Assistant Controller" or "Assistant General Counsel" never land on the
  // board as a "Virtual Assistant" — one of those makes the whole feed look
  // unread by a human.
  if (/\b(assistant|associate|deputy|vice)\s+(controller|manager|director|general counsel|counsel|professor|editor|engineer|producer|buyer|store|branch|brand|product|project|account|vice president|vp|dean|chef|coach|principal|treasurer|secretary of)\b/.test(t)) return 'Other';
  if (/\b(physician|medical|dental|nursing|surgical|clinical|lab(oratory)?|research|teaching|graduate|library|veterinary|pharmacy|care|health ?care|classroom|production|warehouse|kitchen|sales|retail|shop|store)\s+assistant\b/.test(t)) return 'Other';
  if (/\b(assistant\s+(to\s+the\s+)?(store|branch|restaurant|general|regional)\s+manager)\b/.test(t)) return 'Other';

  if (/\b(legal assistant|paralegal|legal secretary|legal support|legal (ops|operations) (assistant|coordinator|specialist)|contract admin(istrator)?|litigation (assistant|support))\b/.test(t)) return 'Legal Assistant';
  if (/\b(executive assistant|executive business partner|executive support|\bea\b|chief of staff|c-suite support|executive (admin(istrator)?|coordinator|operations (partner|coordinator)))\b/.test(t)) return 'Executive Assistant';
  if (/\b(personal assistant|household (manager|assistant)|family assistant|lifestyle (assistant|manager)|estate (manager|assistant)|house manager)\b/.test(t)) return 'Personal Assistant';
  if (/\b(virtual assistant|\bva\b|remote assistant|administrative assistant|admin(istrative)? (assistant|coordinator|specialist|support)|admin assistant|office (admin(istrator)?|assistant|coordinator|manager)|operations assistant|team assistant|inbox|calendar (management|manager)|business support (assistant|officer)|scheduling (assistant|coordinator))\b/.test(t)) return 'Virtual Assistant';
  // Narrow catch-all: "X Assistant" only when X is an admin/ops/office/exec
  // word — the old bare `assistant|coordinator` match pulled in everything.
  if (/\b(admin|office|operations|ops|executive|team|business|support|front[- ]desk|reception)\w*\s+(assistant|coordinator)\b/.test(t)) return 'Virtual Assistant';
  return 'Other';
}

/** Best-effort seniority, used only as a chip in the drawer. */
function levelOf(title = '') {
  const t = title.toLowerCase();
  if (/\b(senior|sr\.?|lead|principal|head of|chief)\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.?|entry|associate|trainee|intern)\b/.test(t)) return 'Entry';
  return 'Mid';
}

const segmentOf = () => 'Startup';

/* ==========================================================================
   INTERNATIONAL-HIRING SIGNAL
   --------------------------------------------------------------------------
   BridgeDesk connects candidates anywhere with employers anywhere. Most
   postings never say whether the company would hire across a border, so this
   is a best-effort SCORE (0-3), not a hard filter. Nothing here excludes a
   posting; 0 just means "the posting is silent on this," which describes most
   of them. The board and the admin console surface the score so a human
   decides who to pitch.

   The field is written as `intl_signal`. `ph_signal` is kept as an alias so
   older readers of the feed keep working.
   ========================================================================== */

const STRONG_SIGNAL = [
  // Explicit cross-border language.
  'anywhere in the world', 'work from anywhere', 'from anywhere', 'global talent',
  'globally distributed', 'hire globally', 'hiring globally', 'international contractor',
  'international candidates', 'any country', 'any location', 'any timezone', 'any time zone',
  'timezone flexible', 'time zone flexible', 'timezone agnostic', 'location agnostic',
  'async-first', 'asynchronous-first', 'work from wherever', 'no location restriction',
  'open to international', 'outside the us', 'outside the u.s.', 'outside the uk',
  'outside the united states', 'employer of record', 'eor',
  // A posting that names an offshore talent market outright.
  'philippines', 'manila', 'cebu', 'filipino', 'latam', 'latin america', 'south africa',
  'eastern europe', 'india-based', 'kenya', 'nigeria', 'pakistan', 'vietnam', 'colombia',
  'argentina', 'brazil', 'mexico', 'portugal', 'poland', 'romania', 'ukraine', 'egypt',
];
const MEDIUM_SIGNAL = [
  'remote-first', 'remote first', 'fully remote', '100% remote', 'fully distributed',
  'distributed team', 'distributed company', 'contractor', 'independent contractor',
  'freelance', 'global', 'international', 'worldwide', 'emea', 'apac', 'multiple countries',
  'across time zones', 'across timezones', 'remote (global)', 'remote - global', 'remote, global',
];
const WEAK_SIGNAL = ['remote', 'anywhere', 'flexible hours', 'async', 'hybrid'];

function intlSignal(title = '', description = '', location = '') {
  const s = `${title} ${description} ${location}`.toLowerCase();
  if (STRONG_SIGNAL.some((k) => s.includes(k))) return 3;
  if (MEDIUM_SIGNAL.some((k) => s.includes(k))) return 2;
  if (WEAK_SIGNAL.some((k) => s.includes(k))) return 1;
  return 0;
}

/* ==========================================================================
   REGION TAGGING
   --------------------------------------------------------------------------
   Replaces the old US-only filter. Nothing is dropped for its location — each
   posting gets a `region` (a short list the board can filter on) and a
   `country` where one can be read from the location string. Unknown or
   "Remote" with no country attached becomes "Remote / Unspecified" rather
   than being guessed as any particular place.
   ========================================================================== */

const US_ABBR = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR']);

const US_STATE_NAMES = ['alabama','alaska','arizona','arkansas','california','colorado','connecticut',
  'delaware','florida','georgia','hawaii','idaho','illinois','indiana','iowa','kansas','kentucky',
  'louisiana','maine','maryland','massachusetts','michigan','minnesota','mississippi','missouri',
  'montana','nebraska','nevada','new hampshire','new jersey','new mexico','new york','north carolina',
  'north dakota','ohio','oklahoma','oregon','pennsylvania','rhode island','south carolina',
  'south dakota','tennessee','texas','utah','vermont','virginia','washington','west virginia',
  'wisconsin','wyoming','district of columbia','puerto rico',
  'san francisco','new york city','nyc','los angeles','austin','seattle','boston','chicago','denver',
  'atlanta','miami','dallas','houston','phoenix','portland','san diego','san jose','bay area'];

// [region, country, keywords...]. Order matters: specific cities before broad
// terms, and "united kingdom" is checked as a whole so "kingdom" alone never
// matches. Keep every keyword lowercase.
const REGION_TABLE = [
  ['Canada', 'Canada', ['canada','ontario','toronto','vancouver','british columbia','alberta','calgary','montreal','quebec','ottawa','winnipeg','edmonton','halifax']],
  ['United Kingdom & Ireland', 'United Kingdom', ['united kingdom','uk','england','london','manchester','birmingham','edinburgh','scotland','wales','cardiff','belfast','bristol','leeds','glasgow']],
  ['United Kingdom & Ireland', 'Ireland', ['ireland','dublin','cork','galway']],
  ['Europe', 'Germany', ['germany','berlin','munich','hamburg','frankfurt','cologne']],
  ['Europe', 'France', ['france','paris','lyon','marseille']],
  ['Europe', 'Spain', ['spain','madrid','barcelona','valencia']],
  ['Europe', 'Portugal', ['portugal','lisbon','porto']],
  ['Europe', 'Netherlands', ['netherlands','amsterdam','rotterdam','the hague','utrecht']],
  ['Europe', 'Poland', ['poland','warsaw','krakow','kraków','wroclaw','wrocław','gdansk','gdańsk']],
  ['Europe', 'Romania', ['romania','bucharest','cluj']],
  ['Europe', 'Ukraine', ['ukraine','kyiv','kiev','lviv']],
  ['Europe', 'Sweden', ['sweden','stockholm','gothenburg']],
  ['Europe', 'Denmark', ['denmark','copenhagen']],
  ['Europe', 'Norway', ['norway','oslo']],
  ['Europe', 'Finland', ['finland','helsinki']],
  ['Europe', 'Switzerland', ['switzerland','zurich','zürich','geneva']],
  ['Europe', 'Austria', ['austria','vienna']],
  ['Europe', 'Belgium', ['belgium','brussels','antwerp']],
  ['Europe', 'Italy', ['italy','milan','rome']],
  ['Europe', 'Czech Republic', ['czech','prague']],
  ['Europe', 'Hungary', ['hungary','budapest']],
  ['Europe', 'Greece', ['greece','athens']],
  ['Europe', 'Estonia', ['estonia','tallinn']],
  ['Europe', 'Lithuania', ['lithuania','vilnius']],
  ['Europe', 'Latvia', ['latvia','riga']],
  ['Europe', 'Bulgaria', ['bulgaria','sofia']],
  ['Europe', 'Serbia', ['serbia','belgrade']],
  ['Europe', 'Croatia', ['croatia','zagreb']],
  ['Europe', 'Europe', ['europe','eu-based','eu based','emea','european']],
  ['Middle East & Africa', 'Israel', ['israel','tel aviv','jerusalem','herzliya','haifa']],
  ['Middle East & Africa', 'United Arab Emirates', ['united arab emirates','uae','dubai','abu dhabi']],
  ['Middle East & Africa', 'Saudi Arabia', ['saudi','riyadh','jeddah']],
  ['Middle East & Africa', 'Turkey', ['turkey','türkiye','istanbul','ankara']],
  ['Middle East & Africa', 'Egypt', ['egypt','cairo']],
  ['Middle East & Africa', 'South Africa', ['south africa','cape town','johannesburg','durban']],
  ['Middle East & Africa', 'Nigeria', ['nigeria','lagos','abuja']],
  ['Middle East & Africa', 'Kenya', ['kenya','nairobi']],
  ['Middle East & Africa', 'Ghana', ['ghana','accra']],
  ['Middle East & Africa', 'Morocco', ['morocco','casablanca']],
  ['Middle East & Africa', 'Middle East & Africa', ['middle east','mea','africa']],
  ['Asia-Pacific', 'Philippines', ['philippines','manila','cebu','makati','taguig','bgc','davao','quezon city','pasig','filipino']],
  ['Asia-Pacific', 'India', ['india','bangalore','bengaluru','mumbai','delhi','new delhi','hyderabad','pune','gurgaon','gurugram','chennai','noida','kolkata']],
  ['Asia-Pacific', 'Pakistan', ['pakistan','karachi','lahore','islamabad']],
  ['Asia-Pacific', 'Bangladesh', ['bangladesh','dhaka']],
  ['Asia-Pacific', 'Sri Lanka', ['sri lanka','colombo']],
  ['Asia-Pacific', 'Singapore', ['singapore']],
  ['Asia-Pacific', 'Malaysia', ['malaysia','kuala lumpur']],
  ['Asia-Pacific', 'Indonesia', ['indonesia','jakarta','bali']],
  ['Asia-Pacific', 'Thailand', ['thailand','bangkok']],
  ['Asia-Pacific', 'Vietnam', ['vietnam','ho chi minh','hanoi']],
  ['Asia-Pacific', 'Japan', ['japan','tokyo','osaka']],
  ['Asia-Pacific', 'South Korea', ['korea','seoul']],
  ['Asia-Pacific', 'China', ['china','shanghai','beijing','shenzhen']],
  ['Asia-Pacific', 'Hong Kong', ['hong kong']],
  ['Asia-Pacific', 'Taiwan', ['taiwan','taipei']],
  ['Asia-Pacific', 'Australia', ['australia','sydney','melbourne','brisbane','perth','adelaide']],
  ['Asia-Pacific', 'New Zealand', ['new zealand','auckland','wellington']],
  ['Asia-Pacific', 'Asia-Pacific', ['apac','asia','asia pacific','asia-pacific','anz']],
  ['Latin America', 'Mexico', ['mexico','mexico city','cdmx','guadalajara','monterrey']],
  ['Latin America', 'Brazil', ['brazil','brasil','sao paulo','são paulo','rio de janeiro']],
  ['Latin America', 'Argentina', ['argentina','buenos aires']],
  ['Latin America', 'Colombia', ['colombia','bogota','bogotá','medellin','medellín']],
  ['Latin America', 'Chile', ['chile','santiago']],
  ['Latin America', 'Peru', ['peru','lima']],
  ['Latin America', 'Costa Rica', ['costa rica','san jose, costa rica']],
  ['Latin America', 'Uruguay', ['uruguay','montevideo']],
  ['Latin America', 'Guatemala', ['guatemala']],
  ['Latin America', 'Dominican Republic', ['dominican republic','santo domingo']],
  ['Latin America', 'Latin America', ['latam','latin america','central america','south america','caribbean']],
];

const GLOBAL_WORDS = /\b(global|worldwide|anywhere|international|any ?where in the world|any (country|location|timezone|time zone)|multiple countries|all countries)\b/;

function regionOf(location = '') {
  const raw = String(location || '').trim();
  const s = raw.toLowerCase();
  if (!s) return { region: 'Remote / Unspecified', country: null };

  // A named non-US place wins even when the string also says "Remote".
  for (const [region, country, keys] of REGION_TABLE) {
    if (keys.some((k) => new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(s))) {
      return { region, country };
    }
  }

  const isUSA = /\b(united states|usa|u\.s\.a?\.?|us-based|us based|us only|us remote|remote - us|remote, us|remote us|america|americas)\b/.test(s)
    || US_STATE_NAMES.some((n) => new RegExp('(^|[^a-z])' + n + '([^a-z]|$)').test(s))
    || (raw.match(/\b([A-Z]{2})\b/g) || []).some((a) => US_ABBR.has(a));
  if (isUSA) return { region: 'United States', country: 'United States' };

  if (GLOBAL_WORDS.test(s)) return { region: 'Remote / Global', country: null };
  if (/\bremote\b|\bwfh\b|\bwork from home\b|\bdistributed\b/.test(s)) return { region: 'Remote / Unspecified', country: null };
  return { region: 'Remote / Unspecified', country: null };
}

/* ==========================================================================
   ADAPTERS
   Each returns an array of raw jobs, or throws. Throwing is how a source
   reports failure — the caller decides what to do about it.
   ========================================================================== */

async function greenhouse(company) {
  const slug = company.atsSlug;
  if (!slug) throw new Error('no atsSlug for greenhouse');
  const res = await get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
  if (!res.ok) throw new Error('greenhouse HTTP ' + res.status);
  const body = await res.json();

  // Greenhouse exposes the board's display name. A slug that resolves to a
  // different company than the one in config.js is the single worst failure
  // mode for this board, so it is logged loudly rather than silently trusted.
  if (company.verified !== true) {
    try {
      const meta = await (await get(`https://boards-api.greenhouse.io/v1/boards/${slug}`)).json();
      if (meta?.name && !meta.name.toLowerCase().includes(company.name.toLowerCase().split(' ')[0])) {
        console.warn(`  WARN  ${company.name}: greenhouse board "${slug}" is named "${meta.name}" — check the slug`);
      }
    } catch { /* metadata is a nicety, not a requirement */ }
  }
  if (!Array.isArray(body.jobs)) throw new Error('greenhouse returned no jobs array');

  return body.jobs.map((j) => {
    const text = toText(j.content);
    return {
      sourceId: String(j.id),
      title: j.title,
      location: j.location?.name || 'Remote',
      url: j.absolute_url,
      description: text,
      postedAt: j.updated_at || j.first_published || null,
      ...parseComp(text),
    };
  });
}

async function lever(company) {
  const slug = company.atsSlug;
  if (!slug) throw new Error('no atsSlug for lever');
  const res = await get(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!res.ok) throw new Error('lever HTTP ' + res.status);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error('lever returned no array');

  return body.map((j) => {
    const text = toText([j.descriptionPlain || j.description, ...(j.lists || []).map((l) => l.content)].join('\n'));
    return {
      sourceId: String(j.id),
      title: j.text,
      location: j.categories?.location || 'Remote',
      url: j.hostedUrl || j.applyUrl,
      description: text,
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      ...parseComp(text + ' ' + (j.salaryRange ? JSON.stringify(j.salaryRange) : '')),
    };
  });
}

async function workday(company) {
  // Workday's CXS endpoint needs a tenant and a site path, both of which vary
  // per client and both of which live in the careers URL:
  //     {tenant}.wdN.myworkdayjobs.com/{site}
  const host = company.atsSlug || '';
  const m = (company.careersUrl || '').match(/myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/?#]+)/);
  const site = company.atsSite || (m && m[1]);
  if (!host || !site) throw new Error('workday needs atsSlug (the host) and a site path');

  const tenant = host.split('.')[0];
  const url = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;

  // This endpoint is a POST with a JSON body, not a GET. A GET returns 405 and
  // looks like the company simply has no openings, which is worse than an error.
  // It also pages 20 at a time, so a large operator needs several calls.
  const all = [];
  const PAGE = 20;
  for (let offset = 0; offset < 400; offset += PAGE) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ appliedFacets: {}, limit: PAGE, offset, searchText: '' }),
    });
    if (!res.ok) throw new Error('workday HTTP ' + res.status);

    const body = await res.json();
    const posts = body.jobPostings || [];
    all.push(...posts);

    const total = body.total ?? all.length;
    if (posts.length < PAGE || all.length >= total) break;
    await sleep(200);              // be polite between pages
  }

  if (!all.length) throw new Error('workday returned no jobPostings');

  return all.map((j) => ({
    sourceId: String(j.bulletFields?.[0] || j.externalPath),
    title: j.title,
    location: j.locationsText || 'Remote',
    // externalPath already starts with a slash, and the public job URL lives
    // under the site path rather than the bare host
    url: `https://${host}/${site}${j.externalPath}`,
    description: '',               // full text needs a second call per job
    postedAt: /^\d{4}-\d{2}-\d{2}/.test(j.startDate || '') ? j.startDate : null,
    ...parseComp(j.title),
  }));
}

/**
 * Generic DOM scrape. Only viable where the careers page server-renders its
 * job links; a JavaScript-rendered board returns nothing here, which is why
 * detect-ats.js refuses to assign this method unless it sees real links.
 */
/**
 * Navigation and call-to-action links live under /careers/ too, and the DOM
 * adapter cannot tell them from postings by URL alone. "See all opportunities"
 * got through an earlier exact-match filter and appeared on the board as a
 * role, which is worse than missing a real one — it makes the whole feed look
 * untrustworthy. When in doubt, drop it.
 */
function isNotAJob(title) {
  const t = title.trim().toLowerCase().replace(/[.!→>»]+$/, '').trim();

  // Whole-phrase CTAs and nav labels.
  if (/^(apply|apply now|view|view all|view more|view jobs?|see all|see more|see jobs?|learn more|read more|explore|explore all|search|search jobs?|browse|browse jobs?|all jobs?|all openings?|current openings?|join us|join our team|work (with|for) us|careers?|jobs?|opportunities|life at .*|our (culture|team|values|benefits)|benefits|culture|diversity.*|back|next|previous|home|contact( us)?|sign in|log ?in|register|subscribe|newsletter|privacy.*|terms.*|cookie.*)$/i.test(t)) return true;

  // "Open Opportunities", "Open Roles", "Current Openings", "Available Positions"
  // — a generic index label, not a specific posting.
  if (/^(open|current|available|latest|all|our|more)\s+(opportunit\w*|roles?|positions?|jobs?|openings?|vacanc\w*)$/i.test(t)) return true;

  // Phrases that begin like a CTA — "See all opportunities", "View our openings".
  if (/^(see|view|browse|explore|search|find|discover|check out|learn)\b.{0,40}\b(job|jobs|role|roles|opening|openings|opportunit\w*|position|positions|career|careers|team)\b/i.test(t)) return true;

  // Location or department index pages rather than a specific posting.
  if (/^(all|browse by|filter by|jobs in|careers in|openings in)\b/i.test(t)) return true;

  // A bare number, a date, or a single short word is not a job title.
  if (/^[\d\s\-–—/,.]+$/.test(t)) return true;
  if (!/\s/.test(t) && t.length < 8) return true;

  return false;
}

async function dom(company) {
  const res = await get(company.careersUrl);
  if (!res.ok) throw new Error('dom HTTP ' + res.status);
  const html = await res.text();

  const seen = new Map();

  // Two ways a link can be a job:
  //
  //   1. the path names one — /job/, /jobs/, /careers/, /job-details/, /p/ …
  //   2. the host is a known ATS, whatever the path looks like
  //
  // The second matters because careers pages increasingly link straight out to
  // a hosted board: Esusu's Webflow page links to jobs.deel.com/<uuid>/
  // job-details/<uuid>/overview, which no path pattern would guess.
  const ATS_HOSTS = /(?:jobs\.deel\.com|boards\.greenhouse\.io|jobs\.lever\.co|jobs\.ashbyhq\.com|apply\.workable\.com|\.breezy\.hr|myworkdayjobs\.com|jobs\.smartrecruiters\.com|recruiting\.paylocity\.com|jobs\.jobvite\.com|icims\.com)/i;
  const re = /<a[^>]+href="([^"#]+)"[^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    const looksLikeJobPath = /\/(?:job|jobs|careers|opening|position)s?[\/-]|\/job-details\//i.test(href);
    if (!looksLikeJobPath && !ATS_HOSTS.test(href)) continue;

    const title = toText(m[2]).split('\n')[0].trim();
    if (!title || title.length < 3 || title.length > 140) continue;
    if (isNotAJob(title)) continue;
    const url = href.startsWith('http') ? href : new URL(href, res.url).href;
    if (!seen.has(url)) seen.set(url, { sourceId: url, title, location: 'See posting', url, description: '', postedAt: null, min: null, max: null });
  }

  const jobs = [...seen.values()];
  if (!jobs.length) throw new Error('dom found no job links — page is probably JS-rendered');
  return jobs;
}


/**
 * Careers sites that publish an XML sitemap and embed JobPosting JSON-LD on
 * each page — how Paradox.ai-hosted sites (Invitation Homes) expose their
 * roles. Plain HTTP, no headless browser, so it runs fine on a CI runner.
 */
async function jsonld(company) {
  const sitemapUrl = company.sitemap;
  if (!sitemapUrl) throw new Error('jsonld needs a "sitemap" URL in config');
  const isJob = company.jobUrlPattern ? new RegExp(company.jobUrlPattern) : /\/job\//;
  const MAX = 300;                      // cap the per-page fetches

  const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  const text = async (url) => {
    const r = await get(url);
    if (!r.ok) throw new Error(url + ' → ' + r.status);
    return r.text();
  };

  // The top-level sitemap is often an index pointing at child sitemaps.
  const top = locs(await text(sitemapUrl));
  let urls = top.filter((u) => isJob.test(u));
  if (!urls.length) {
    for (const child of top.filter((u) => /sitemap/i.test(u) && u.endsWith('.xml'))) {
      try { urls.push(...locs(await text(child)).filter((u) => isJob.test(u))); }
      catch { /* skip an unreadable child sitemap */ }
    }
  }
  urls = [...new Set(urls)].slice(0, MAX);
  if (!urls.length) throw new Error('sitemap listed no job pages');

  const jobs = [];
  for (const url of urls) {
    try {
      const html = await text(url);
      const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      for (const raw of blocks) {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }
        for (const it of Array.isArray(parsed) ? parsed : [parsed]) {
          if (!it || it['@type'] !== 'JobPosting' || !it.title) continue;
          let loc = it.jobLocation;
          if (Array.isArray(loc)) loc = loc[0];
          const addr = (loc && loc.address) || {};
          const description = toText(it.description || '');
          jobs.push({
            sourceId: it.identifier?.value || it.url || url,
            title: it.title,
            location: [addr.addressLocality, addr.addressRegion].filter(Boolean).join(', ') || 'See posting',
            url: it.url || url,
            description,
            postedAt: it.datePosted || null,
            ...parseComp(description + ' ' + (it.baseSalary ? JSON.stringify(it.baseSalary) : '')),
          });
        }
      }
    } catch { /* skip an unreadable page rather than invent a row */ }
    await sleep(120);                   // be polite: this is many page fetches
  }
  if (!jobs.length) throw new Error('no JobPosting JSON-LD found');
  return jobs;
}

/** Breezy HR publishes a plain JSON board. Used by some smaller startups. */
async function breezy(company) {
  const slug = company.atsSlug;
  if (!slug) throw new Error('no atsSlug for breezy');
  const res = await get(`https://${slug}.breezy.hr/json`);
  if (!res.ok) throw new Error('breezy HTTP ' + res.status);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error('breezy returned no array');

  return body.map((j) => {
    const description = toText(j.description || '');
    return {
      sourceId: String(j.id || j.url),
      title: j.name,
      location: j.location?.name || 'Remote',
      url: j.url,
      description,
      postedAt: j.published_date || null,
      ...parseComp(description),
    };
  });
}


/**
 * Reffie's careers page is Framer-hosted with no public ATS, but it is
 * server-rendered: the listing links to /jobs/<slug> pages, each carrying an
 * og:title of the form "Reffie | Role - Location".
 *
 * Site-specific and fragile by nature — Framer markup can change. It skips
 * anything it cannot parse rather than guessing, so a redesign costs you the
 * company's listings, never a page of invented ones.
 */
async function reffie(company) {
  const listUrl = company.listUrl || company.careersUrl;
  if (!listUrl) throw new Error('reffie needs a listUrl');
  const origin = new URL(listUrl).origin;

  const res = await get(listUrl);
  if (!res.ok) throw new Error('reffie HTTP ' + res.status);
  const html = await res.text();

  const slugs = [...new Set([...html.matchAll(/jobs\/([a-z0-9][a-z0-9-]+)/gi)].map((m) => m[1].toLowerCase()))]
    .filter((s) => s !== 'jobs');
  if (!slugs.length) throw new Error('no job links found on the listing page');

  const jobs = [];
  for (const slug of slugs) {
    const url = `${origin}/jobs/${slug}`;
    try {
      const page = await get(url);
      if (!page.ok) continue;
      const body = await page.text();
      const og = (body.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || [])[1];
      if (!og) continue;

      const cleaned = toText(og).replace(/^\s*Reffie\s*[|｜]\s*/i, '').trim();
      let title = cleaned, location = 'Remote';
      const dash = cleaned.lastIndexOf(' - ');
      if (dash > -1) {
        title = cleaned.slice(0, dash).trim();
        location = cleaned.slice(dash + 3).trim();
      }
      if (title && !isNotAJob(title)) {
        jobs.push({ sourceId: slug, title, location, url, description: '', postedAt: null, min: null, max: null });
      }
    } catch { /* skip an unreadable page */ }
    await sleep(150);
  }

  if (!jobs.length) throw new Error('no readable postings');
  return jobs;
}


/**
 * Ashby publishes a public JSON board — no key, no scraping. Common among
 * newer venture-backed companies, so this is likely to resolve several of the
 * vendors currently failing as "JS-rendered".
 */
async function ashby(company) {
  const slug = company.atsSlug;
  if (!slug) throw new Error('no atsSlug for ashby');

  const res = await get(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
  if (!res.ok) throw new Error('ashby HTTP ' + res.status);
  const body = await res.json();
  const list = body?.jobs;
  if (!Array.isArray(list)) throw new Error('ashby returned no jobs array');

  return list.filter((j) => j.isListed !== false).map((j) => {
    const description = toText(j.descriptionHtml || j.descriptionPlain || '');
    // Ashby gives structured compensation when the employer fills it in —
    // better than parsing it back out of the description.
    let min = null, max = null;
    const salary = (j.compensation?.compensationTierSummary || '') + ' ' + description;
    ({ min, max } = parseComp(salary));

    return {
      sourceId: String(j.id),
      title: j.title,
      location: j.location || j.address?.postalAddress?.addressLocality || 'Remote',
      url: j.jobUrl || j.applyUrl,
      description,
      postedAt: j.publishedAt || null,
      min, max,
    };
  });
}


/**
 * Workable's public board API. The slug is the path on apply.workable.com —
 * often not the company name: Belong's is "belong-6", because earlier accounts
 * took the plain name first.
 *
 * The endpoint is a POST that returns pages of 100. It also returns roles in
 * every country, so the US filter downstream does real work here.
 */
async function workable(company) {
  const slug = company.atsSlug;
  if (!slug) throw new Error('no atsSlug for workable');

  const out = [];
  let token = null;

  for (let page = 0; page < 12; page++) {
    const res = await fetch(
      `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}?details=true` +
      (token ? `&token=${encodeURIComponent(token)}` : ''),
      { headers: { 'User-Agent': UA, Accept: 'application/json' } });

    if (!res.ok) throw new Error('workable HTTP ' + res.status);
    const body = await res.json();
    const jobs = body?.jobs;
    if (!Array.isArray(jobs)) throw new Error('workable returned no jobs array');

    for (const j of jobs) {
      const description = toText(j.description || '');
      const city = j.city || j.location?.city || '';
      const region = j.state || j.region || j.location?.region || '';
      const country = j.country || j.location?.country || '';
      out.push({
        sourceId: String(j.shortcode || j.id),
        title: j.title,
        // Country is kept in the string so the US filter can see it —
        // Belong posts heavily in Buenos Aires.
        location: [city, region, country].filter(Boolean).join(', ') || 'Remote',
        url: j.url || j.application_url || `https://apply.workable.com/${slug}/j/${j.shortcode}/`,
        description,
        postedAt: j.published_on || j.created_at || null,
        ...parseComp(description),
      });
    }

    token = body?.nextPage || null;
    if (!token || jobs.length === 0) break;
    await sleep(200);
  }

  return out;
}

const ADAPTERS = { greenhouse, lever, workday, jsonld, breezy, ashby, workable, reffie, dom };

/* ==========================================================================
   RUN
   ========================================================================== */

function normalise(raw, company) {
  const description = raw.description || '';
  return {
    id: `${company.method}:${company.id}:${raw.sourceId}`,
    hub: company.hub,
    title: String(raw.title).trim(),
    company: company.name,
    company_id: company.id,
    priority: company.priority === true,
    category: categorise(raw.title),
    segment: segmentOf(),
    level: levelOf(raw.title),
    location: String(raw.location || 'Remote').trim(),
    employment_type: /intern/i.test(raw.title) ? 'contract' : 'full-time',
    comp_min: raw.min,
    comp_max: raw.max,
    region: regionOf(raw.location).region,
    country: regionOf(raw.location).country,
    intl_signal: intlSignal(raw.title, description, raw.location),
    ph_signal: intlSignal(raw.title, description, raw.location),   // alias, see above
    summary: summarise(description) || `${raw.title} at ${company.name}.`,
    description,
    apply_url: raw.url,
    source: company.method,
    posted_at: raw.postedAt,
    scraped_at: new Date().toISOString(),
    status: 'open',
  };
}

async function scrapeOne(company) {
  const adapter = ADAPTERS[company.method];
  if (!adapter) return { company, ok: false, skipped: true, reason: 'no scrape method set', jobs: [] };
  try {
    const raw = await adapter(company);
    // A few companies keep the ATS feed live but disable the public pages it
    // links to. Where linkOverride is set, point every job at their working
    // careers site instead of a dead URL.
    const raw2 = company.linkOverride
      ? raw.map((j) => ({ ...j, url: company.linkOverride }))
      : raw;
    const usable = raw2.filter((j) => j && j.title && j.sourceId);
    // Only assistant-family roles belong on this board — everything else this
    // company posts (engineers, AEs, whatever) gets dropped here.
    const relevant = usable.filter((j) => categorise(j.title) !== 'Other');
    // No location filter: every assistant-family role is kept, wherever it is,
    // and tagged with a region so the board can filter on it.
    const dropped = usable.length - relevant.length;
    return { company, ok: true, jobs: relevant.map((j) => normalise(j, company)), dropped, seen: usable.length };
  } catch (err) {
    return { company, ok: false, reason: err.message, jobs: [] };
  }
}

/** Jobs from the last successful run, so a failing source does not vanish. */
async function loadPrevious(path) {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(await readFile(path, 'utf8'));
    const jobs = Array.isArray(data) ? data : data.jobs;
    return Array.isArray(jobs) ? jobs : [];
  } catch {
    return [];
  }
}

const targets = COMPANIES
  .filter((c) => c.active !== false)
  .filter((c) => (args.hub ? c.hub === args.hub : true))
  .filter((c) => (args.only ? c.id === args.only : true));

const ready = targets.filter((c) => c.method);
const pending = targets.filter((c) => !c.method);

console.log(`Scraping ${ready.length} companies` +
  (pending.length ? `, skipping ${pending.length} with no method set` : '') + '\n');

const results = [];
for (let i = 0; i < ready.length; i += CONCURRENCY) {
  const batch = await Promise.all(ready.slice(i, i + CONCURRENCY).map(scrapeOne));
  for (const r of batch) {
    const label = r.company.name.padEnd(30).slice(0, 30);
    console.log(r.ok
      ? `  ok    ${label} ${r.jobs.length} role${r.jobs.length === 1 ? '' : 's'}` +
        (r.dropped ? `  (${r.dropped} non-assistant roles skipped)` : '')
      : `  FAIL  ${label} ${r.reason}`);
  }
  results.push(...batch);
  if (i + CONCURRENCY < ready.length) await sleep(DELAY_MS);
}

const okResults = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok && !r.skipped);
const failedIds0 = new Set(failed.map((r) => r.company.id));
const fresh = okResults.flatMap((r) => r.jobs);

// Carry over jobs from sources that failed this run. A scrape failure is not
// evidence that a company stopped hiring, and dropping them would make the
// board look like the market emptied out.
// Anything this run did not freshly produce is carried over from the previous
// feed. Two distinct cases matter here:
//
//   1. a company that FAILED this run — a scrape failure is not evidence that
//      a company stopped hiring
//   2. a company that was OUT OF SCOPE this run — `--hub=`, `--only=` and
//      `active:false` all narrow the target list, and those companies' roles
//      must survive untouched
//
// In short: a scrape updates the companies it covered and leaves the rest alone.
const scrapedIds = new Set(okResults.map((r) => r.company.id));
const previous = await loadPrevious(OUT);
const carried = previous
  .filter((j) => !String(j.id || '').startsWith('sample:'))   // placeholder rows never survive a real run
  .filter((j) => !scrapedIds.has(j.company_id));

const outOfScope = carried.filter((j) => !failedIds0.has(j.company_id)).length;
const fromFailed = carried.length - outOfScope;

const all = [...fresh, ...carried];

console.log('\n' + '-'.repeat(60));
const droppedTotal = okResults.reduce((n, r) => n + (r.dropped || 0), 0);
console.log(`scraped   ${fresh.length} roles from ${okResults.length} sources`);
if (droppedTotal) console.log(`filtered  ${droppedTotal} non-assistant roles`);
if (fromFailed) console.log(`carried   ${fromFailed} roles from ${failed.length} failed source(s)`);
if (outOfScope) console.log(`kept      ${outOfScope} roles from companies not in this run`);
if (pending.length) console.log(`skipped   ${pending.length} companies with no method — run scripts/detect-ats.js`);
if (failed.length) {
  console.log(`\nfailed ${failed.length}:`);
  failed.forEach((r) => console.log(`  ${r.company.name.padEnd(30).slice(0, 30)} ${r.reason}`));
}

// A priority company failing empties the hub it anchors, so say so loudly
// rather than leaving it as one line among forty.
const priorityFailed = failed.filter((r) => r.company.priority);
if (priorityFailed.length) {
  console.log('\n' + '!'.repeat(60));
  console.log('PRIORITY COMPANIES FAILED — the board will look empty without these:');
  priorityFailed.forEach((r) => console.log(`  ${r.company.name}: ${r.reason}`));
  console.log('!'.repeat(60));
}

// Per-category totals, so "no Legal Assistant roles today" is visible in the
// log rather than only on the live site.
for (const cat of ['Virtual Assistant', 'Executive Assistant', 'Personal Assistant', 'Legal Assistant']) {
  const n = all.filter((j) => j.category === cat).length;
  const src = new Set(all.filter((j) => j.category === cat).map((j) => j.company)).size;
  const strong = all.filter((j) => j.category === cat && j.intl_signal >= 2).length;
  console.log(`${cat.padEnd(20)} ${String(n).padStart(4)} roles from ${src} companies (${strong} reading open to international hires)`);
}
const byRegion = {};
for (const j of all) byRegion[j.region || 'Remote / Unspecified'] = (byRegion[j.region || 'Remote / Unspecified'] || 0) + 1;
console.log('by region  ' + Object.entries(byRegion).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(' · '));

// Every source failing is an outage, not a quiet day — refuse to overwrite
// the feed in that case so yesterday's roles stay up.
//
// Every source SUCCEEDING and finding zero assistant roles is different: that
// is a true result, not a bug. The old rule exited 1 here too, which made the
// daily Action fail on any quiet day and looked exactly like a broken scraper.
// Now an empty-but-healthy run writes an empty feed and the site shows its
// "no roles right now" state.
const totalFailure = ready.length > 0 && okResults.length === 0;
if (!all.length && totalFailure) {
  console.error('\nNo jobs collected and every source failed — refusing to write an empty feed.');
  process.exit(1);
}
if (!all.length) console.warn('\nAll sources answered but none has an assistant-family role open today. Writing an empty feed; consider adding companies to config.js.');

if (args.dry) {
  console.log('\ndry run — nothing written');
  process.exit(0);
}

const feed = {
  generated_at: new Date().toISOString(),
  count: all.length,
  sources_ok: okResults.length,
  sources_failed: failed.length,
  sources_skipped: pending.length,
  regions: Object.fromEntries(Object.entries(byRegion).sort((a, b) => b[1] - a[1])),
  jobs: all.sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || '')),
};

await writeFile(OUT, JSON.stringify(feed, null, 2) + '\n');
console.log(`\nwrote ${OUT} — ${all.length} roles`);

/* --------------------------------------------------------------------------
   Send the snapshot to the history table.
   --------------------------------------------------------------------------
   The feed is overwritten every day; this is what keeps the record of what was
   open when, and therefore what got filled and how fast. It cannot be
   reconstructed after the fact.

   Skipped silently if HISTORY_URL and HISTORY_KEY are not set, so the scraper
   still works without it. A failure here is reported but never fails the run —
   the feed matters more than the archive.
   -------------------------------------------------------------------------- */
const HISTORY_URL = process.env.HISTORY_URL;
const HISTORY_KEY = process.env.HISTORY_KEY;

if (HISTORY_URL && HISTORY_KEY) {
  try {
    const res = await fetch(HISTORY_URL.replace(/\/$/, '') + '/api/history/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': HISTORY_KEY },
      body: JSON.stringify({
        sources_ok: okResults.length,
        sources_failed: failed.length,
        jobs: all.map((j) => ({
          id: j.id, hub: j.hub, company: j.company, company_id: j.company_id,
          title: j.title, category: j.category, level: j.level, location: j.location,
          region: j.region, country: j.country, intl_signal: j.intl_signal,
          comp_min: j.comp_min, comp_max: j.comp_max,
          apply_url: j.apply_url, source: j.source, posted_at: j.posted_at,
        })),
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`history  NOT recorded — ${body.error || res.status}`);
    } else {
      console.log(`history  ${body.recorded} roles recorded · ${body.new_roles} new · ${body.closed} closed` +
        (body.closing_skipped ? '  (closing skipped: run looked unreliable)' : ''));
    }
  } catch (err) {
    console.error('history  NOT recorded —', err.message);
  }
} else {
  console.log('history  skipped (HISTORY_URL / HISTORY_KEY not set)');
}

if (totalFailure) {
  console.error('\nEvery source failed. The feed kept its previous roles, but this needs looking at.');
  process.exit(1);
}
