#!/usr/bin/env node
/**
 * run.js — job scraper
 * ---------------------------------------------------------------------------
 * Pulls open roles from company career pages and writes site/jobs.json beside
 * site/index.html, which the page reads directly. No database.
 *
 *   node run.js                          # every company with a known method
 *   node run.js --hub=legal              # one hub
 *   node run.js --only=entrata           # one company
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
 * Which assistant/VA-niche category a posting belongs to. These are the
 * buckets the board filters by (dynamically, from whatever shows up in
 * jobs.json) and the buckets the matching engine's free-text category fit
 * scores against, so a title should land in exactly one specific bucket
 * rather than a vague catch-all. Order matters: more specific niches are
 * checked before the general "Virtual Assistant" fallback so e.g. a
 * "Social Media Virtual Assistant" title lands in Social Media Manager,
 * not the generic bucket.
 */
function categorise(title = '') {
  const t = title.toLowerCase();
  if (/\b(legal assistant|paralegal|legal secretary|contracts? (assistant|coordinator|admin))\b/.test(t)) return 'Legal Assistant';
  if (/\b(executive assistant|\bea\b|chief of staff|assistant to the (ceo|founder|president|cfo|coo|cto))\b/.test(t)) return 'Executive Assistant';
  if (/\b(personal assistant|\bpa\b|household|family assistant|lifestyle (assistant|manager))\b/.test(t)) return 'Personal Assistant';
  if (/\b(administrative assistant|admin assistant|admin(istrative)? (associate|coordinator|support)|office (assistant|coordinator|manager))\b/.test(t)) return 'Administrative Assistant';
  if (/\b(social media (manager|assistant|coordinator|specialist|strategist))\b/.test(t)) return 'Social Media Manager';
  if (/\b(graphic designer|graphic artist|visual designer)\b/.test(t)) return 'Graphic Designer';
  if (/\b(content writer|content creator|copywriter|blog writer)\b/.test(t)) return 'Content Writer';
  if (/\b(customer (support|service) (assistant|associate|specialist|representative|agent|coordinator)|customer success (assistant|associate))\b/.test(t)) return 'Customer Support';
  if (/\b(data entry (clerk|specialist|assistant|associate|operator))\b/.test(t)) return 'Data Entry Specialist';
  if (/\b(bookkeeper|bookkeeping (assistant|associate|clerk))\b/.test(t)) return 'Bookkeeping Assistant';
  if (/\b(seo (specialist|assistant|associate))\b/.test(t)) return 'SEO Specialist';
  if (/\b(email marketing (assistant|specialist|coordinator))\b/.test(t)) return 'Email Marketing Specialist';
  if (/\b((e-?commerce|amazon) (assistant|specialist|coordinator|virtual assistant))\b/.test(t)) return 'E-commerce Assistant';
  if (/\bcommunity manager\b/.test(t)) return 'Community Manager';
  if (/\bvideo editor\b/.test(t)) return 'Video Editor';
  if (/\btranscriptionist\b/.test(t)) return 'Transcriptionist';
  if (/\b(appointment setter|scheduling assistant|scheduler)\b/.test(t)) return 'Appointment Setter';
  if (/\bproject coordinator\b/.test(t)) return 'Project Coordinator';
  if (/\bpodcast (manager|editor|producer)\b/.test(t)) return 'Podcast Manager';
  if (/\blead generation (specialist|assistant)\b/.test(t)) return 'Lead Generation Specialist';
  if (/\b(virtual assistant|\bva\b|operations? (assistant|coordinator))\b/.test(t)) return 'Virtual Assistant';
  return 'Other';
}

/** Best-effort seniority, used only as a chip in the drawer. */
function levelOf(title = '') {
  const t = title.toLowerCase();
  if (/\b(senior|sr\.?|lead|principal)\b/.test(t)) return 'Senior';
  if (/\b(junior|jr\.?|entry|associate)\b/.test(t)) return 'Entry';
  return 'Mid';
}

const segmentOf = (company) => company.segment || (company.hub === 'legal' ? 'Legal Tech' : 'Startup');

/**
 * Is this posting actually an assistant-type role? Startups post far more
 * engineering and sales roles than admin-support ones, so every job pulled
 * from a company's full feed gets checked here before it reaches the board.
 * A posting that doesn't match is dropped, not miscategorised as "Other" —
 * "Other" is reserved for genuine near-misses a human should still see.
 */
/**
 * Every remote VA niche this board accepts, not just the core four. Kept as
 * one list so isAssistantRole and categorise can't quietly drift apart —
 * if a niche belongs on the board, it needs a matching bucket in categorise()
 * too, or it scrapes in and immediately falls into "Other".
 */
const NICHE_TITLES = /\b(virtual assistant|\bva\b|executive assistant|\bea\b|personal assistant|\bpa\b|legal assistant|paralegal|legal secretary|administrative assistant|admin assistant|admin(?:istrative)? (?:associate|coordinator|support)|office (?:manager|coordinator|assistant)|operations? (?:assistant|coordinator)|chief of staff|assistant to the|social media (?:manager|assistant|coordinator|specialist|strategist)|graphic designer|graphic artist|visual designer|content writer|content creator|copywriter|blog writer|customer (?:support|service) (?:assistant|associate|specialist|representative|agent|coordinator)|customer success (?:assistant|associate)|data entry (?:clerk|specialist|assistant|associate|operator)|bookkeeper|bookkeeping (?:assistant|associate|clerk)|seo (?:specialist|assistant|associate)|email marketing (?:assistant|specialist|coordinator)|(?:e-?commerce|amazon) (?:assistant|specialist|coordinator|virtual assistant)|community manager|video editor|transcriptionist|appointment setter|scheduling assistant|scheduler|project coordinator|podcast (?:manager|editor|producer)|lead generation (?:specialist|assistant))\b/;

/**
 * A handful of terms that, if present, mean this is almost certainly a
 * different (often much more senior or unrelated) role that happens to share
 * a word with one of the niches above — e.g. "Product Designer" contains no
 * niche term and is already excluded by NICHE_TITLES not matching it, but
 * "UX Designer, Client Success Assistant Program" is the kind of compound
 * title this list guards against. Kept short and specific deliberately: a
 * missing VA posting is worse than one extra "Other" row a human can ignore.
 */
function isAssistantRole(title = '') {
  const t = title.toLowerCase();
  if (!NICHE_TITLES.test(t)) return false;
  const exclude = /\b(account executive|software engineer|(?:senior |staff |principal )?(?:backend|frontend|full[- ]?stack) developer|product designer|ux designer|ui designer|marketing manager|marketing director|product marketing|growth marketing|brand marketing|recruiter|recruiting|data scientist|business analyst|financial analyst|product manager)\b/;
  if (exclude.test(t)) return false;
  return true;
}

/* ==========================================================================
   GLOBAL-FRIENDLY FILTER
   --------------------------------------------------------------------------
   Every company in config.js is a real startup — that is guaranteed by the
   scrape list, not by this filter. What this filter checks is the posting
   itself: could this role actually be done remotely by someone outside the
   company's home country, or does it require physical presence in an office
   / residency in one specific country? A candidate should never be shown a
   role they cannot actually take.
   ========================================================================== */

// Phrases that mean "this seat is in a building," not "remote."
const ONSITE_ONLY = /\b(on[- ]?site|in[- ]?office|in[- ]?person only|must (be|reside) (in|within) (the )?(office|hq|headquarters))\b/i;

// Phrases that restrict hiring to one specific country or region, which rules
// out an international hire even when the posting also says "remote." Covers
// the residency-lock phrasing most common in English-language postings —
// not exhaustive for every country, so this only removes what it is
// confident about (see the function doc below).
const RESIDENCY_LOCKED = /\b(u\.?s\.? citizens? only|must be (a )?u\.?s\.? citizen|must reside in the (united states|u\.?s\.?)|u\.?s\.?[- ]based candidates only|no (visa sponsorship|international candidates)|not open to candidates outside the (u\.?s\.?|united states)|EU residents? only|UK residents? only|singapore(an)? citizens? only|malaysian citizens? only|must (be|reside) in singapore|must (be|reside) in malaysia)\b/i;

// Phrases in the location or description that signal the opposite — genuinely
// open to hiring anywhere, which is exactly what this board is looking for.
const OPEN_ANYWHERE = /\b(remote|anywhere|worldwide|global|international|work from home|distributed team|remote[- ]first)\b/i;

/**
 * Could an internationally-based hire actually take this role?
 *
 * Deliberately asymmetric, the same way the original US-only filter was: a
 * posting that clearly locks itself to a physical office or a residency
 * requirement is dropped; anything ambiguous is kept. A missing job is harder
 * to notice than an extra one, so this only removes what it is confident
 * about.
 */
function isGloballyOpen(location, description) {
  const loc = String(location || '').toLowerCase();
  const text = (loc + ' ' + String(description || '').toLowerCase()).trim();
  if (!text) return true;                    // unknown: keep

  if (RESIDENCY_LOCKED.test(text)) return false;
  if (ONSITE_ONLY.test(text) && !OPEN_ANYWHERE.test(text)) return false;

  // A bare US city/state with no remote language at all reads as an
  // in-office role — keep it only if the description says otherwise.
  const looksLikeBareUSCity = /,\s*[A-Z]{2}\b/.test(String(location || '')) && !OPEN_ANYWHERE.test(text);
  if (looksLikeBareUSCity && ONSITE_ONLY.test(text)) return false;

  return true;
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

/** Breezy HR publishes a plain JSON board. Used by smaller startups. */
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

const ADAPTERS = { greenhouse, lever, workday, jsonld, breezy, ashby, workable, dom };

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
    segment: segmentOf(company),
    level: levelOf(raw.title),
    location: String(raw.location || 'Remote').trim(),
    employment_type: /intern/i.test(raw.title) ? 'contract' : 'full-time',
    comp_min: raw.min,
    comp_max: raw.max,
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
    // links to (Belong's jobs.lever.co URLs all 404). Where linkOverride is
    // set, point every job at their working careers site instead of a dead URL.
    const raw2 = company.linkOverride
      ? raw.map((j) => ({ ...j, url: company.linkOverride }))
      : raw;
    const usable = raw2.filter((j) => j && j.title && j.sourceId);
    // Only assistant-type roles belong on this board — a company's full feed
    // is mostly engineering, sales, etc.
    const assistantRoles = usable.filter((j) => isAssistantRole(j.title));
    const globallyOpen = assistantRoles.filter((j) => isGloballyOpen(j.location, j.description));
    const dropped = usable.length - globallyOpen.length;
    return { company, ok: true, jobs: globallyOpen.map((j) => normalise(j, company)), dropped };
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
        (r.dropped ? `  (${r.dropped} not assistant-type/not globally open)` : '')
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
// feed. Two distinct cases, and missing the second one is what made
// `--hub=business` followed by `--hub=legal` show only Legal Support:
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
const carried = previous.filter((j) => !scrapedIds.has(j.company_id));

const outOfScope = carried.filter((j) => !failedIds0.has(j.company_id)).length;
const fromFailed = carried.length - outOfScope;

const all = [...fresh, ...carried];

console.log('\n' + '-'.repeat(60));
const droppedTotal = okResults.reduce((n, r) => n + (r.dropped || 0), 0);
console.log(`scraped   ${fresh.length} roles from ${okResults.length} sources`);
if (droppedTotal) console.log(`filtered  ${droppedTotal} roles (not assistant-type or not globally open)`);
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

// Per-hub totals, so "no OpCo roles" is visible in the log rather than only
// on the live site.
for (const h of ['business', 'legal']) {
  const n = all.filter((j) => j.hub === h).length;
  const src = new Set(all.filter((j) => j.hub === h).map((j) => j.company)).size;
  console.log(`${h.padEnd(9)} ${String(n).padStart(4)} roles from ${src} companies`);
  if (n === 0) console.log(`          ^ nothing for the ${h} hub — check the failures above`);
}

// Refuse to publish an empty feed. Better to leave yesterday's file in place
// than to replace a working board with nothing.
if (!all.length) {
  console.error('\nNo jobs collected — refusing to write an empty feed.');
  process.exit(1);
}

if (args.dry) {
  console.log('\ndry run — nothing written');
  process.exit(0);
}

// Every source failing is an outage, not a quiet day. The feed still holds
// carried-over roles so the board keeps working, but the run is marked failed
// so GitHub emails you instead of the problem going unnoticed for weeks.
const totalFailure = ready.length > 0 && okResults.length === 0;

const feed = {
  generated_at: new Date().toISOString(),
  count: all.length,
  sources_ok: okResults.length,
  sources_failed: failed.length,
  jobs: all.sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || '')),
};

await writeFile(OUT, JSON.stringify(feed, null, 2) + '\n');
console.log(`\nwrote ${OUT} — ${all.length} roles`);

/* No history-sync step here — this build only writes the daily feed to
   site/jobs.json. If you want a historical record of postings over time,
   add a `job_history` table to schema.sql and a matching endpoint in
   worker.js, then reintroduce a sync step here. */

if (totalFailure) {
  console.error('\nEvery source failed. The feed kept its previous roles, but this needs looking at.');
  process.exit(1);
}
