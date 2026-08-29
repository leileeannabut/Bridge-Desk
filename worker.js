/**
 * worker.js — BridgeDesk API + site
 * ---------------------------------------------------------------------------
 * Everything runs on Cloudflare. No third party sees your data — it goes
 * into a D1 database you own.
 *
 * Routes
 *   POST /api/click              record a job-board click        (public)
 *   POST /api/apply              apply to a scraped job listing   (public)
 *   POST /api/pool               "Join our Pool" candidate intake (public)
 *   POST /api/employer           employer / Hire-a-Team intake    (public)
 *   POST /api/admin/login        admin sign-in                    (public, key-gated)
 *   GET  /api/admin/applications list job applications            (admin)
 *   POST /api/admin/applications update an application's status   (admin)
 *   GET  /api/admin/pool         list pool candidates              (admin)
 *   POST /api/admin/pool         update a candidate's status       (admin)
 *   GET  /api/admin/employers    list employer requests            (admin)
 *   POST /api/admin/employers    update an employer request        (admin)
 *   POST /api/admin/match        compute matches for one employer request (admin)
 *   GET  /api/admin/matches      list matches                      (admin)
 *   POST /api/admin/matches      update a match's status            (admin)
 *   anything else                the static site
 *
 * There is no fee-agreement gate. An employer's confirmation screen hands
 * them a payment link directly (env.WISE_LINK); nothing about introductions
 * is blocked on a signed agreement. If a D1 binding is missing, the site
 * still serves normally and API calls that need it return a clear 503 rather
 * than crashing the page.
 */

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

/* A submitted value is a small, fixed shape. Anything longer is truncated
   rather than rejected, so one long field never costs the whole submission. */
function clean(value, max = 400) {
  if (value === null || value === undefined) return null;
  return String(value).slice(0, max).trim() || null;
}

// resume_url is a base64 data: URL, not a short field, so it needs far more
// than the 500-char cap this used to have — but not unlimited either.
// Cloudflare D1 enforces a hard 2,000,000-byte max size for any single
// string/BLOB/row. The front end caps uploads at 1MB, which becomes ~1.4MB
// of base64 — this cap matches that with a little headroom, so a resume
// that slips past client-side validation still fails safely (truncated,
// not silently rejected by D1) instead of blowing the row limit.
const MAX_RESUME_CHARS = 1_800_000;
function cleanResumeUrl(value) {
  return clean(value, MAX_RESUME_CHARS);
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Short human reference, e.g. "BD-7K2M". Not a security token — just a label. */
function makeRef(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

/* ==========================================================================
   ADMIN AUTH
   Same pattern throughout: header first (never appears in browser history),
   cookie second (for anything already signed in), query string last (handy
   for quick checks / CSV-style export links).
   ========================================================================== */
function adminAuthed(request, env) {
  if (!env.ADMIN_KEY) return false;
  if (request.headers.get('x-admin-key') === env.ADMIN_KEY) return true;
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)bd_admin=([^;]+)/);
  if (m && m[1] === env.ADMIN_KEY) return true;
  return new URL(request.url).searchParams.get('key') === env.ADMIN_KEY;
}

async function adminLogin(request, env) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  if (!env.ADMIN_KEY || body.key !== env.ADMIN_KEY) {
    return json({ error: 'Wrong key.' }, 401);
  }
  return json({ ok: true }, 200, {
    'set-cookie': `bd_admin=${env.ADMIN_KEY}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200`,
  });
}

function requireAdmin(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  if (!adminAuthed(request, env)) return json({ error: 'unauthorised' }, 401);
  return null;
}

/* ==========================================================================
   PUBLIC: click tracking
   ========================================================================== */
async function recordClick(request, env) {
  if (!env.DB) return new Response(null, { status: 204 });
  let body;
  try { body = await request.json(); } catch { return new Response(null, { status: 204 }); }
  try {
    await env.DB.prepare(
      'insert into job_clicks (job_id, job_title, company) values (?1, ?2, ?3)'
    ).bind(clean(body.job_id, 200), clean(body.job_title, 200), clean(body.company, 200)).run();
  } catch { /* tracking is best-effort, never blocks the click-through */ }
  return new Response(null, { status: 204 });
}

/* ==========================================================================
   PUBLIC: candidate applies to a specific job listing
   ========================================================================== */
async function receiveApplication(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const name = clean(body.name, 200);
  const email = clean(body.email, 200);
  if (!name || !isEmail(email)) return json({ error: 'Name and a valid email are required.' }, 400);

  const ref = makeRef('BD');
  await env.DB.prepare(
    `insert into applications
      (ref, job_id, job_title, company, category, name, email, phone, resume_url, cover_note)
     values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`
  ).bind(
    ref, clean(body.job_id, 200), clean(body.job_title, 200), clean(body.company, 200),
    clean(body.category, 60), name, email, clean(body.phone, 60),
    cleanResumeUrl(body.resume_url), clean(body.cover_note, 4000)
  ).run();

  return json({ ok: true, ref });
}

/* ==========================================================================
   PUBLIC: "Join our Pool" — general candidate intake, not tied to one job
   ========================================================================== */
async function joinPool(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const name = clean(body.name, 200);
  const email = clean(body.email, 200);
  if (!name || !isEmail(email)) return json({ error: 'Name and a valid email are required.' }, 400);

  const ref = makeRef('POOL');
  await env.DB.prepare(
    `insert into pool_candidates
      (ref, name, email, phone, category, years_experience, skills, rate_expectation,
       availability, timezone_overlap, english_level, bio, resume_url, portfolio_url)
     values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)`
  ).bind(
    ref, name, email, clean(body.phone, 60),
    clean(body.category, 60), clean(body.years_experience, 60), clean(body.skills, 1000),
    clean(body.rate_expectation, 120), clean(body.availability, 200), clean(body.timezone_overlap, 200),
    clean(body.english_level, 120), clean(body.bio, 4000), cleanResumeUrl(body.resume_url), clean(body.portfolio_url, 500)
  ).run();

  return json({ ok: true, ref });
}

/* ==========================================================================
   PUBLIC: employer intake — single hire or Hire-a-Team (which now also
   covers a fully managed 24/7 team, anchored by a Senior EA, employed by
   BridgeDesk rather than the client).
   No fee-agreement gate. The response hands back a payment link directly.
   ========================================================================== */
async function employerIntake(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const company = clean(body.company, 200);
  const contactName = clean(body.contact_name, 200);
  const email = clean(body.email, 200);
  const tier = body.tier === 'team' ? 'team' : 'single';
  if (!company || !contactName || !isEmail(email)) {
    return json({ error: 'Company, contact name, and a valid email are required.' }, 400);
  }

  const ref = makeRef('EMP');
  const teamSize = tier === 'team' ? Math.max(2, parseInt(body.team_size, 10) || 2) : null;
  const rolesNeeded = Array.isArray(body.roles_needed) ? body.roles_needed.join(', ') : clean(body.roles_needed, 300);

  await env.DB.prepare(
    `insert into employer_requests
      (ref, tier, company, contact_name, email, phone, roles_needed, team_size, budget_range, timeline, notes)
     values (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`
  ).bind(
    ref, tier, company, contactName, email, clean(body.phone, 60),
    rolesNeeded, teamSize, clean(body.budget_range, 120), clean(body.timeline, 200), clean(body.notes, 2000)
  ).run();

  const paymentUrl = env.WISE_LINK || 'https://wise.com/pay/business/bridgedesk';
  return json({
    ok: true,
    ref,
    tier,
    payment_url: paymentUrl,
    message: tier === 'team'
      ? "Team request received — we'll contact you via email with next steps. Send the placement deposit below to begin sourcing your team."
      : "Request received — we'll contact you via email with next steps. Send the placement deposit below and we will start matching candidates right away.",
  });
}

/* ==========================================================================
   ADMIN: list / update applications
   ========================================================================== */
async function listApplications(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const sql = status
    ? 'select * from applications where status = ?1 order by created_at desc limit 500'
    : 'select * from applications order by created_at desc limit 500';
  const rows = status
    ? await env.DB.prepare(sql).bind(status).all()
    : await env.DB.prepare(sql).all();
  return json({ applications: rows.results || [] });
}

async function updateApplication(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  if (!body.ref) return json({ error: 'ref is required.' }, 400);
  await env.DB.prepare(
    'update applications set status = ?1, decline_reason = ?2 where ref = ?3'
  ).bind(clean(body.status, 40) || 'new', clean(body.decline_reason, 300), clean(body.ref, 20)).run();
  return json({ ok: true });
}

/* ==========================================================================
   ADMIN: list / update pool candidates
   ========================================================================== */
async function listPool(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const sql = category
    ? 'select * from pool_candidates where category = ?1 order by created_at desc limit 500'
    : 'select * from pool_candidates order by created_at desc limit 500';
  const rows = category
    ? await env.DB.prepare(sql).bind(category).all()
    : await env.DB.prepare(sql).all();
  return json({ candidates: rows.results || [] });
}

async function updatePool(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  if (!body.ref) return json({ error: 'ref is required.' }, 400);
  await env.DB.prepare('update pool_candidates set status = ?1 where ref = ?2')
    .bind(clean(body.status, 40) || 'new', clean(body.ref, 20)).run();
  return json({ ok: true });
}

/* ==========================================================================
   ADMIN: AI resume review
   ---------------------------------------------------------------------------
   Reviews a pool candidate's uploaded resume with Claude and stores the
   result back on the candidate row, where scoreCandidate() picks it up as
   one more signal (see the "resume AI review" component above). Requires
   an ANTHROPIC_API_KEY secret (wrangler secret put ANTHROPIC_API_KEY) and
   three columns on pool_candidates that a fresh schema.sql won't have yet —
   see the migration note in DEPLOY.md.
   ========================================================================== */

/** Split a "data:<mime>;base64,<data>" string into its parts, or null. */
function parseDataUrl(dataUrl) {
  const m = /^data:([^;,]+)(?:;charset=[^;,]+)?;base64,([\s\S]*)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  return { mediaType: m[1].toLowerCase(), base64: m[2] };
}

/**
 * Turn a parsed resume into a Claude API content block. Claude's Messages
 * API can read a PDF directly as a document block, or plain text inline —
 * it can't parse .doc/.docx binary, so those come back as null and the
 * caller reports that plainly rather than sending garbage to the model.
 */
function buildResumeContentBlock({ mediaType, base64 }) {
  if (mediaType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };
  }
  if (/^image\/(png|jpeg|jpg|gif|webp)$/.test(mediaType)) {
    const normalised = mediaType === 'image/jpg' ? 'image/jpeg' : mediaType;
    return { type: 'image', source: { type: 'base64', media_type: normalised, data: base64 } };
  }
  if (mediaType === 'text/plain') {
    let text = '';
    try { text = atob(base64); } catch { return null; }
    return { type: 'text', text: text.slice(0, 20000) };
  }
  return null;
}

async function reviewResume(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY is not set. Run: wrangler secret put ANTHROPIC_API_KEY' }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  const ref = clean(body.ref, 20);
  if (!ref) return json({ error: 'ref is required.' }, 400);

  const candidate = await env.DB.prepare('select * from pool_candidates where ref = ?1').bind(ref).first();
  if (!candidate) return json({ error: 'No pool candidate with that ref.' }, 404);
  if (!candidate.resume_url) return json({ error: 'This candidate has no resume on file.' }, 400);

  const parsed = parseDataUrl(candidate.resume_url);
  if (!parsed) return json({ error: 'resume_url is not a data: URL — nothing to review.' }, 400);

  const block = buildResumeContentBlock(parsed);
  if (!block) {
    return json({
      error: `Can't read a ${parsed.mediaType || 'this'} resume yet — PDF, plain text, or an image of the resume work today. Ask the candidate to re-upload as a PDF.`,
    }, 422);
  }

  const prompt = `You are screening a resume for a remote ${candidate.category || 'assistant'} role, for a job board that places Filipino virtual/executive/personal/legal assistants and related remote support niches with employers worldwide.

Candidate's self-reported details:
- Category: ${candidate.category || 'not stated'}
- Years of experience (self-reported): ${candidate.years_experience || 'not stated'}
- Skills (self-reported): ${candidate.skills || 'not stated'}
- English level (self-reported): ${candidate.english_level || 'not stated'}

Review the attached resume and respond with ONLY a JSON object — no markdown fences, no prose outside the JSON — in exactly this shape:
{"fit_score": <integer 0-100>, "estimated_years_experience": <number or null>, "strengths": [<short strings>], "concerns": [<short strings>], "summary": "<2-3 sentence plain-language summary for a recruiter>"}

fit_score should reflect overall fit for professional remote assistant/support work in general — resume clarity, relevant experience, and any red flags — not only whether it matches the stated category exactly.`;

  let apiRes;
  try {
    apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
      }),
    });
  } catch (err) {
    return json({ error: `Could not reach the Claude API: ${err.message}` }, 502);
  }

  if (!apiRes.ok) {
    const errText = await apiRes.text().catch(() => '');
    return json({ error: `Claude API error (${apiRes.status}): ${errText.slice(0, 300)}` }, 502);
  }

  const apiData = await apiRes.json();
  const textBlock = (apiData.content || []).find((b) => b.type === 'text');
  if (!textBlock) return json({ error: 'Claude API returned no text content.' }, 502);

  let review;
  try {
    review = JSON.parse(textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return json({ error: 'Could not parse the AI review as JSON.', raw: textBlock.text.slice(0, 2000) }, 502);
  }

  const fitScore = Math.max(0, Math.min(100, Math.round(Number(review.fit_score) || 0)));
  const summary = clean(review.summary, 2000);

  await env.DB.prepare(
    'update pool_candidates set ai_review_score = ?1, ai_review_summary = ?2, ai_reviewed_at = ?3 where ref = ?4'
  ).bind(fitScore, summary, new Date().toISOString(), ref).run();

  return json({
    ok: true,
    ref,
    fit_score: fitScore,
    summary,
    strengths: Array.isArray(review.strengths) ? review.strengths.slice(0, 10) : [],
    concerns: Array.isArray(review.concerns) ? review.concerns.slice(0, 10) : [],
    estimated_years_experience: review.estimated_years_experience ?? null,
  });
}

/* ==========================================================================
   ADMIN: list / update employer requests
   ========================================================================== */
async function listEmployers(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const rows = await env.DB.prepare('select * from employer_requests order by created_at desc limit 500').all();
  return json({ employers: rows.results || [] });
}

async function updateEmployer(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  if (!body.ref) return json({ error: 'ref is required.' }, 400);
  await env.DB.prepare(
    'update employer_requests set status = coalesce(?1, status), payment_status = coalesce(?2, payment_status) where ref = ?3'
  ).bind(clean(body.status, 40), clean(body.payment_status, 40), clean(body.ref, 20)).run();
  return json({ ok: true });
}

/* ==========================================================================
   ADMIN: matching engine
   ---------------------------------------------------------------------------
   Transparent, heuristic, and conservative — the same philosophy as the
   scraper: a wrong-but-confident score is worse than an honest partial one,
   so every component of the score is visible in `rationale` rather than
   hidden inside a single opaque number.
   ========================================================================== */
function parseMoney(s) {
  const nums = String(s || '').match(/\d[\d,]*(\.\d+)?/g);
  if (!nums) return null;
  return nums.map((n) => parseFloat(n.replace(/,/g, '')));
}

function parseYears(s) {
  const m = String(s || '').match(/(\d+(\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function scoreCandidate(candidate, employer) {
  const notes = [];
  let score = 0;

  // Category fit — the single most important signal. No overlap, no match.
  const wanted = String(employer.roles_needed || '').toLowerCase();
  const fits = candidate.category && wanted.includes(String(candidate.category).toLowerCase());
  if (fits) { score += 40; notes.push(`+40 category fit (${candidate.category})`); }
  else { notes.push('+0 category — not one of the roles requested'); }

  // Rate fit — best-effort, conservative. No numbers on either side: neutral.
  const candRate = parseMoney(candidate.rate_expectation);
  const budget = parseMoney(employer.budget_range);
  if (candRate && budget) {
    const candMax = Math.max(...candRate);
    const budgetMax = Math.max(...budget);
    if (candMax <= budgetMax) { score += 20; notes.push('+20 rate within stated budget'); }
    else if (candMax <= budgetMax * 1.15) { score += 10; notes.push('+10 rate slightly above budget'); }
    else notes.push('+0 rate — above stated budget');
  } else {
    score += 10; notes.push('+10 rate — not enough detail on one side to compare');
  }

  // Experience — more is better, capped, never penalised for "too senior".
  const years = parseYears(candidate.years_experience);
  if (years !== null) {
    const pts = Math.min(20, Math.round(years * 4));
    score += pts; notes.push(`+${pts} experience (${years} yrs stated)`);
  } else {
    notes.push('+0 experience — not stated');
  }

  // Timezone overlap — the employer could now be anywhere, not just the US,
  // so this rewards any specific, checkable overlap language rather than
  // only US zone names. A named zone or region (in any part of the world)
  // scores highest; a vague "flexible hours" mention scores partial; nothing
  // stated scores zero.
  const tz = String(candidate.timezone_overlap || '').toLowerCase();
  const namedZone = /\b(gmt|utc|[a-z]{2,4}t\b|eastern|pacific|central|mountain|cet|cest|bst|ist|sgt|myt|aest|aedt|jst|kst|hkt)\b|[+-]\d{1,2}(:\d{2})?\s*(gmt|utc)?/;
  if (namedZone.test(tz)) {
    score += 20; notes.push('+20 timezone overlap stated (named zone/region)');
  } else if (tz) {
    score += 10; notes.push('+10 timezone — some overlap language, unclear how much');
  } else {
    notes.push('+0 timezone — not stated');
  }

  // Resume AI review — only contributes once an admin has actually run one
  // (see reviewResume / POST /api/admin/review-resume). Deliberately a
  // smaller weight than category fit: it's a useful second opinion on a
  // resume's quality and red flags, not a replacement for the candidate's
  // own stated fit.
  if (candidate.ai_review_score != null && candidate.ai_review_score !== '') {
    const reviewScore = Math.max(0, Math.min(100, Number(candidate.ai_review_score)));
    const pts = Math.round((reviewScore / 100) * 15);
    score += pts; notes.push(`+${pts} resume AI review (${reviewScore}/100 fit)`);
  } else {
    notes.push('+0 resume AI review — not yet run');
  }

  return { score: Math.min(100, score), rationale: notes.join('; ') };
}

async function runMatch(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  const employerRef = clean(body.employer_ref, 20);
  if (!employerRef) return json({ error: 'employer_ref is required.' }, 400);

  const employer = await env.DB.prepare('select * from employer_requests where ref = ?1').bind(employerRef).first();
  if (!employer) return json({ error: 'No employer request with that ref.' }, 404);

  const pool = await env.DB.prepare(
    "select * from pool_candidates where status != 'placed' order by created_at desc limit 300"
  ).all();
  const candidates = pool.results || [];

  const scored = candidates.map((c) => ({ candidate: c, ...scoreCandidate(c, employer) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // top ten, so the admin console isn't flooded with 0-fit rows

  const inserted = [];
  for (const s of scored) {
    const res = await env.DB.prepare(
      'insert into matches (candidate_id, employer_request_id, score, rationale) values (?1,?2,?3,?4)'
    ).bind(s.candidate.id, employer.id, s.score, s.rationale).run();
    inserted.push({ match_id: res.meta.last_row_id, candidate_ref: s.candidate.ref, candidate_name: s.candidate.name, score: s.score, rationale: s.rationale });
  }

  return json({ ok: true, employer_ref: employerRef, matches: inserted });
}

async function listMatches(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const employerRef = url.searchParams.get('employer_ref');
  let sql = `
    select m.id, m.score, m.rationale, m.status, m.created_at,
           p.ref as candidate_ref, p.name as candidate_name, p.category as candidate_category, p.email as candidate_email,
           e.ref as employer_ref, e.company as employer_company
    from matches m
    join pool_candidates p on p.id = m.candidate_id
    join employer_requests e on e.id = m.employer_request_id`;
  const binds = [];
  if (employerRef) { sql += ' where e.ref = ?1'; binds.push(employerRef); }
  sql += ' order by m.score desc limit 500';
  const rows = binds.length
    ? await env.DB.prepare(sql).bind(...binds).all()
    : await env.DB.prepare(sql).all();
  return json({ matches: rows.results || [] });
}

async function updateMatch(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  if (!body.id) return json({ error: 'id is required.' }, 400);
  await env.DB.prepare('update matches set status = ?1 where id = ?2')
    .bind(clean(body.status, 40) || 'suggested', parseInt(body.id, 10)).run();
  return json({ ok: true });
}

/* ==========================================================================
   ROUTER
   ========================================================================== */
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (pathname === '/api/click' && method === 'POST') return recordClick(request, env);
    if (pathname === '/api/apply' && method === 'POST') return receiveApplication(request, env);
    if (pathname === '/api/pool' && method === 'POST') return joinPool(request, env);
    if (pathname === '/api/employer' && method === 'POST') return employerIntake(request, env);

    if (pathname === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
    if (pathname === '/api/admin/applications' && method === 'GET') return listApplications(request, env);
    if (pathname === '/api/admin/applications' && method === 'POST') return updateApplication(request, env);
    if (pathname === '/api/admin/pool' && method === 'GET') return listPool(request, env);
    if (pathname === '/api/admin/pool' && method === 'POST') return updatePool(request, env);
    if (pathname === '/api/admin/review-resume' && method === 'POST') return reviewResume(request, env);
    if (pathname === '/api/admin/employers' && method === 'GET') return listEmployers(request, env);
    if (pathname === '/api/admin/employers' && method === 'POST') return updateEmployer(request, env);
    if (pathname === '/api/admin/match' && method === 'POST') return runMatch(request, env);
    if (pathname === '/api/admin/matches' && method === 'GET') return listMatches(request, env);
    if (pathname === '/api/admin/matches' && method === 'POST') return updateMatch(request, env);

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
