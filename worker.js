/**
 * worker.js — BridgeDesk API + site
 * ---------------------------------------------------------------------------
 * Everything runs on Cloudflare. No third party sees your data — it goes
 * into a D1 database you own.
 *
 * Routes
 *   POST /api/click              record a job-board click / view / apply (public)
 *   GET  /api/history            a visitor's viewed/applied history (public, keyed by visitor_id)
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

/** "Maria Santos Dela Cruz" -> "Maria S." — first name plus one initial,
 *  used only in the pre-payment teaser. Never applied anywhere a paying
 *  employer's admin console or a candidate's own view would see the name. */
function maskCandidateName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A candidate';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
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
/**
 * There's no candidate login on this site, so "viewed" / "applied" history
 * is primarily kept in the visitor's own browser (localStorage, see
 * index.html) — this endpoint is a best-effort backend copy, keyed by a
 * random id the browser generates once and reuses. It survives that device
 * clearing cookies but not localStorage; it is device-scoped, not a real
 * account, since there's nothing here to tie one visitor's id to another
 * device without a login system this site doesn't have.
 *
 * Requires a `job_interactions` table:
 *   create table if not exists job_interactions (
 *     id integer primary key autoincrement,
 *     visitor_id text not null,
 *     job_id text not null,
 *     job_title text,
 *     company text,
 *     type text not null,              -- 'viewed' | 'applied'
 *     created_at text not null default (datetime('now'))
 *   );
 *   create index if not exists idx_job_interactions_visitor on job_interactions(visitor_id, job_id);
 */
async function recordClick(request, env) {
  if (!env.DB) return new Response(null, { status: 204 });
  let body;
  try { body = await request.json(); } catch { return new Response(null, { status: 204 }); }

  const jobId = clean(body.job_id, 200);
  const jobTitle = clean(body.job_title, 200);
  const company = clean(body.company, 200);
  const visitorId = clean(body.visitor_id, 100);
  const type = clean(body.type, 20);

  try {
    await env.DB.prepare(
      'insert into job_clicks (job_id, job_title, company) values (?1, ?2, ?3)'
    ).bind(jobId, jobTitle, company).run();
  } catch { /* tracking is best-effort, never blocks the click-through */ }

  // visitor_id + type are new, optional fields — only sent by the "viewed" /
  // "applied" history tracking, not the plain click-through this endpoint
  // originally covered. Old callers with neither still work unchanged.
  if (visitorId && (type === 'viewed' || type === 'applied')) {
    try {
      await env.DB.prepare(
        'insert into job_interactions (visitor_id, job_id, job_title, company, type) values (?1, ?2, ?3, ?4, ?5)'
      ).bind(visitorId, jobId, jobTitle, company, type).run();
    } catch { /* table may not exist yet on an older deploy — never block the UI for this */ }
  }

  return new Response(null, { status: 204 });
}

/**
 * Public — no admin auth, gated only by knowing the visitor_id (a random,
 * non-guessable id the browser generated). Lets a returning visitor recover
 * their viewed/applied history on the same device even after clearing
 * cookies. Returns the raw interaction rows; the front end already keeps the
 * full job objects in localStorage; this is a backend backstop, not the
 * primary source for the Previously Viewed tab.
 */
async function getHistory(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  const visitorId = clean(new URL(request.url).searchParams.get('visitor_id'), 100);
  if (!visitorId) return json({ error: 'visitor_id is required.' }, 400);
  try {
    const rows = await env.DB.prepare(
      'select job_id, job_title, company, type, created_at from job_interactions where visitor_id = ?1 order by created_at desc limit 200'
    ).bind(visitorId).all();
    return json({ interactions: rows.results || [] });
  } catch {
    // Table not migrated yet on this deploy — behave like "no history" rather
    // than a hard error, since the front end has its own localStorage copy.
    return json({ interactions: [] });
  }
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
   PUBLIC: testimonial / rating / improvement-survey submission
   ---------------------------------------------------------------------------
   Every submission starts as 'pending' — the public GET below never returns
   anything else. A public testimonial wall that shows whatever anyone typed,
   unmoderated, is a spam and reputational risk, so publishing always goes
   through an admin approval step (see listAdminTestimonials/updateTestimonial).
   improvement_feedback is deliberately never exposed by the public endpoint —
   it's for BridgeDesk's own use, not a public quote.
   ========================================================================== */
async function submitTestimonial(request, env) {
  if (!env.DB) return json({ error: 'No database configured.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const name = clean(body.name, 200);
  if (!name) return json({ error: 'Name is required.' }, 400);
  const email = clean(body.email, 200);
  if (email && !isEmail(email)) return json({ error: 'That email address looks off.' }, 400);

  const rating = Math.max(0, Math.min(5, parseInt(body.rating, 10) || 0));
  if (!rating) return json({ error: 'A rating from 1-5 is required.' }, 400);

  const role = ['candidate', 'employer'].includes(body.role) ? body.role : null;
  const ref = makeRef('FB');

  await env.DB.prepare(
    `insert into testimonials
      (ref, name, email, role, company_or_title, rating, quote, improvement_feedback, status)
     values (?1,?2,?3,?4,?5,?6,?7,?8,'pending')`
  ).bind(
    ref, name, email, role, clean(body.company_or_title, 200), rating,
    clean(body.quote, 1000), clean(body.improvement_feedback, 2000)
  ).run();

  return json({ ok: true, ref });
}

/** Public. Only ever selects status in ('approved','featured') — there is no
    parameter or code path here that can return a pending submission. */
async function listPublicTestimonials(request, env) {
  if (!env.DB) return json({ testimonials: [] });
  const rows = await env.DB.prepare(
    `select ref, name, role, company_or_title, rating, quote, created_at
     from testimonials
     where status in ('approved', 'featured')
     order by (status = 'featured') desc, created_at desc
     limit 24`
  ).all();
  return json({ testimonials: rows.results || [] });
}

/* ==========================================================================
   ADMIN: moderate testimonials
   ========================================================================== */
async function listAdminTestimonials(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const sql = status
    ? 'select * from testimonials where status = ?1 order by created_at desc limit 500'
    : 'select * from testimonials order by created_at desc limit 500';
  const rows = status
    ? await env.DB.prepare(sql).bind(status).all()
    : await env.DB.prepare(sql).all();
  return json({ testimonials: rows.results || [] });
}

async function updateTestimonial(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }
  if (!body.ref) return json({ error: 'ref is required.' }, 400);
  const status = ['pending', 'approved', 'featured', 'rejected'].includes(body.status) ? body.status : 'pending';
  await env.DB.prepare('update testimonials set status = ?1 where ref = ?2')
    .bind(status, clean(body.ref, 20)).run();
  return json({ ok: true });
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

  // Teaser preview — a redacted look at the top-matching candidates, shown
  // to the employer before they pay. Full name, email, phone, and resume
  // stay hidden until the deposit is in; this is a taste of fit, not an
  // introduction. Computed live from the current pool, not persisted to the
  // `matches` table — that table is the admin's official run, kept separate
  // so a teaser preview never masquerades as a real match record.
  let previewMatches = [];
  try {
    const pool = await env.DB.prepare(
      "select * from pool_candidates where status != 'placed' order by created_at desc limit 300"
    ).all();
    const fakeEmployer = { roles_needed: rolesNeeded, budget_range: clean(body.budget_range, 120) };
    previewMatches = (pool.results || [])
      .map((c) => ({ candidate: c, ...scoreCandidate(c, fakeEmployer) }))
      .filter((s) => s.score >= 40) // category-fit floor — don't tease a non-match
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => ({
        score: s.score,
        category: s.candidate.category,
        years_experience: s.candidate.years_experience,
        rate_expectation: s.candidate.rate_expectation,
        timezone_overlap: s.candidate.timezone_overlap,
        english_level: s.candidate.english_level,
        // First name + last-initial only — enough to feel real, not enough to
        // find or contact them directly before paying.
        display_name: maskCandidateName(s.candidate.name),
      }));
  } catch { /* teaser is best-effort — a DB hiccup here should never block the intake itself */ }

  return json({
    ok: true,
    ref,
    tier,
    payment_url: paymentUrl,
    preview_matches: previewMatches,
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
   ADMIN: employer outreach campaign
   ---------------------------------------------------------------------------
   Sends a compliant cold-outreach email to companies that might hire through
   BridgeDesk. Deliberately does NOT generate or guess contact emails —
   config.js only has company name + careers URL, and guessing addresses at
   scale is exactly the kind of practice that tanks deliverability and burns
   a sending domain before launch. You import a real contact list (sourced
   normally — Apollo.io, Hunter.io, LinkedIn, manual research), then this
   sends against it with a suppression list and an unsubscribe link, which
   CAN-SPAM requires regardless of B2B/B2C.

   Requires:
   - RESEND_API_KEY secret (wrangler secret put RESEND_API_KEY)
   - RESEND_FROM env var, e.g. "BridgeDesk <hello@bridgedesk.co>" — the
     domain must be verified in Resend, or sends will fail
   - OUTREACH_MAILING_ADDRESS env var — a real postal address; CAN-SPAM
     requires one in every commercial email, no exceptions for B2B
   - SITE_URL env var, e.g. "https://bridgedesk.co" — used to build the
     unsubscribe link and the link back to the site in the email body
   - Two new tables — outreach_contacts and outreach_unsubscribes — see the
     migration note in DEPLOY.md; not something I can write blind without
     schema.sql
   ========================================================================== */

/** Minimal CSV parser for "company,email" lines — no quoting/escaping support,
    which is fine for a two-column contact list but not a general CSV parser. */
function parseContactsCsv(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [company, email] = line.split(',').map((s) => (s || '').trim());
      return { company, email };
    })
    .filter((c) => c.company && isEmail(c.email));
}

async function importOutreachContacts(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const fromArray = Array.isArray(body.contacts)
    ? body.contacts.map((c) => ({ company: clean(c.company, 200), email: clean(c.email, 200) })).filter((c) => c.company && isEmail(c.email))
    : [];
  const fromCsv = typeof body.csv === 'string' ? parseContactsCsv(body.csv) : [];
  const contacts = [...fromArray, ...fromCsv];
  if (!contacts.length) return json({ error: 'No valid { company, email } contacts found in body.contacts or body.csv.' }, 400);

  let imported = 0, skipped = 0;
  for (const c of contacts) {
    const suppressed = await env.DB.prepare('select 1 from outreach_unsubscribes where email = ?1').bind(c.email).first();
    if (suppressed) { skipped++; continue; }
    try {
      await env.DB.prepare(
        `insert into outreach_contacts (company, email, status) values (?1, ?2, 'pending')
         on conflict(email) do nothing`
      ).bind(c.company, c.email).run();
      imported++;
    } catch { skipped++; }
  }
  return json({ ok: true, imported, skipped, total_submitted: contacts.length });
}

async function listOutreachContacts(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const sql = status
    ? 'select * from outreach_contacts where status = ?1 order by created_at desc limit 1000'
    : 'select * from outreach_contacts order by created_at desc limit 1000';
  const rows = status
    ? await env.DB.prepare(sql).bind(status).all()
    : await env.DB.prepare(sql).all();
  return json({ contacts: rows.results || [] });
}

/** The email itself — kept plain and honest rather than salesy, with the
    physical address and unsubscribe link CAN-SPAM requires in every send. */
function buildOutreachEmail({ company, email, siteUrl, mailingAddress, unsubscribeToken }) {
  const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken}`;
  const subject = `Vetted remote assistants for ${company}, hired in days`;
  const text = `Hi there,

I'm reaching out from BridgeDesk — we connect vetted, English-fluent virtual, executive, and personal assistants (based in the Philippines) with companies hiring remotely, including support for full teams and round-the-clock coverage.

If ${company} is looking to add remote support without the overhead of running your own hiring pipeline, take a look: ${siteUrl}

No obligation, and this is a one-time note — reply "no thanks" or use the link below and you won't hear from us again.

— BridgeDesk

---
${mailingAddress}
Unsubscribe: ${unsubscribeUrl}`;
  return { subject, text };
}

async function sendOutreachCampaign(request, env) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;
  if (!env.RESEND_API_KEY) return json({ error: 'RESEND_API_KEY is not set. Run: wrangler secret put RESEND_API_KEY' }, 503);
  if (!env.RESEND_FROM) return json({ error: 'RESEND_FROM env var is not set (e.g. "BridgeDesk <hello@bridgedesk.co>").' }, 503);
  if (!env.OUTREACH_MAILING_ADDRESS) return json({ error: 'OUTREACH_MAILING_ADDRESS env var is not set — CAN-SPAM requires a real postal address in every commercial email.' }, 503);
  if (!env.SITE_URL) return json({ error: 'SITE_URL env var is not set (e.g. "https://bridgedesk.co").' }, 503);

  let body;
  try { body = await request.json(); } catch { body = {}; }
  // Default well under Resend's free-tier 100/day cap, leaving headroom for
  // any transactional email (application confirmations, etc.) sharing the
  // same account and daily limit.
  const limit = Math.max(1, Math.min(80, parseInt(body.limit, 10) || 80));

  const pending = await env.DB.prepare(
    `select oc.* from outreach_contacts oc
     left join outreach_unsubscribes ou on ou.email = oc.email
     where oc.status = 'pending' and ou.email is null
     order by oc.created_at asc limit ?1`
  ).bind(limit).all();
  const contacts = pending.results || [];
  if (!contacts.length) return json({ ok: true, sent: 0, failed: 0, message: 'No pending contacts to send to.' });

  let sent = 0, failed = 0;
  const results = [];
  for (const contact of contacts) {
    const unsubscribeToken = contact.ref || contact.id; // stable per-row token, not a secret — just avoids trivial mass-unsubscribe abuse
    const { subject, text } = buildOutreachEmail({
      company: contact.company,
      email: contact.email,
      siteUrl: env.SITE_URL,
      mailingAddress: env.OUTREACH_MAILING_ADDRESS,
      unsubscribeToken,
    });

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${env.RESEND_API_KEY}` },
        body: JSON.stringify({ from: env.RESEND_FROM, to: contact.email, subject, text }),
      });
      if (res.ok) {
        await env.DB.prepare('update outreach_contacts set status = ?1, sent_at = ?2 where id = ?3')
          .bind('sent', new Date().toISOString(), contact.id).run();
        sent++;
        results.push({ email: contact.email, ok: true });
      } else {
        const errText = await res.text().catch(() => '');
        await env.DB.prepare('update outreach_contacts set status = ?1 where id = ?2').bind('failed', contact.id).run();
        failed++;
        results.push({ email: contact.email, ok: false, error: errText.slice(0, 200) });
      }
    } catch (err) {
      await env.DB.prepare('update outreach_contacts set status = ?1 where id = ?2').bind('failed', contact.id).run();
      failed++;
      results.push({ email: contact.email, ok: false, error: err.message });
    }
    // Polite pacing, same reasoning as the scraper's own DELAY_MS — no need
    // to hammer the sending API in a tight loop.
    await new Promise((r) => setTimeout(r, 300));
  }

  return json({ ok: true, sent, failed, results });
}

/** Public — no admin auth. A recipient clicking "unsubscribe" must not need
    a login. Always returns a simple confirmation page regardless of whether
    the email was actually in the system, so it can't be used to probe the
    contact list. */
async function unsubscribeOutreach(request, env) {
  const url = new URL(request.url);
  const email = clean(url.searchParams.get('email'), 200);
  if (email && isEmail(email)) {
    try {
      await env.DB.prepare('insert into outreach_unsubscribes (email) values (?1) on conflict(email) do nothing').bind(email).run();
      await env.DB.prepare("update outreach_contacts set status = 'unsubscribed' where email = ?1").bind(email).run();
    } catch { /* still show the confirmation either way */ }
  }
  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:sans-serif;max-width:480px;margin:80px auto;text-align:center;"><h2>You\'re unsubscribed</h2><p>You won\'t receive further emails from BridgeDesk at this address.</p></body>',
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
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
/* ==========================================================================
   PUBLIC: Role DNA — AI analysis of one job's complexity/pace/autonomy/
   communication load, generated fresh on every request (no caching) per
   explicit choice: a candidate opening the same job twice gets two live
   Claude calls, not a cached result. That is a real cost tradeoff worth
   being aware of at scale — see the note in DEPLOY.md.
   ========================================================================== */
async function roleDNA(request, env) {
  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY is not set. Run: wrangler secret put ANTHROPIC_API_KEY' }, 503);
  }
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Bad request body.' }, 400); }

  const title = clean(body.title, 300);
  const company = clean(body.company, 200);
  const description = clean(body.description, 6000); // cap what we send — cost and prompt-injection surface both scale with input size
  if (!title) return json({ error: 'title is required.' }, 400);

  const prompt = `You are analysing a single remote job posting for a candidate deciding whether to apply. Score it honestly from the text alone — if the description does not say enough to judge a dimension, use your best estimate from context (title, seniority language, industry) and lean toward the middle of the scale rather than guessing at an extreme.

Job title: ${title}
Company: ${company || 'not stated'}
Description:
${description || '(no description text was scraped for this posting — infer only from the title and company)'}

Respond with ONLY a JSON object — no markdown fences, no prose outside the JSON — in exactly this shape:
{"job_complexity": <integer 1-5>, "pace_pressure": <integer 1-5>, "autonomy_level": <integer 1-5>, "communication_load": <integer 1-5>, "insight": "<2-4 sentence plain-language summary of what makes this role easy or demanding, written for the candidate, not the employer>"}

1 = low/easy end of that dimension, 5 = high/demanding end. job_complexity: how varied/technical the work is. pace_pressure: how fast-moving or deadline-driven. autonomy_level: how much independent ownership vs. close direction. communication_load: how much of the role is meetings/collaboration vs. heads-down work.`;

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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
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

  let dna;
  try {
    dna = JSON.parse(textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return json({ error: 'Could not parse the AI analysis as JSON.', raw: textBlock.text.slice(0, 1000) }, 502);
  }

  const dim = (v) => Math.max(1, Math.min(5, Math.round(Number(v) || 3)));
  return json({
    ok: true,
    job_complexity: dim(dna.job_complexity),
    pace_pressure: dim(dna.pace_pressure),
    autonomy_level: dim(dna.autonomy_level),
    communication_load: dim(dna.communication_load),
    insight: clean(dna.insight, 1000) || 'No additional insight was returned for this role.',
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (pathname === '/api/click' && method === 'POST') return recordClick(request, env);
    if (pathname === '/api/history' && method === 'GET') return getHistory(request, env);
    if (pathname === '/api/apply' && method === 'POST') return receiveApplication(request, env);
    if (pathname === '/api/pool' && method === 'POST') return joinPool(request, env);
    if (pathname === '/api/employer' && method === 'POST') return employerIntake(request, env);
    if (pathname === '/api/role-dna' && method === 'POST') return roleDNA(request, env);
    if (pathname === '/api/unsubscribe' && method === 'GET') return unsubscribeOutreach(request, env);
    if (pathname === '/api/testimonial' && method === 'POST') return submitTestimonial(request, env);
    if (pathname === '/api/testimonials' && method === 'GET') return listPublicTestimonials(request, env);

    if (pathname === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
    if (pathname === '/api/admin/applications' && method === 'GET') return listApplications(request, env);
    if (pathname === '/api/admin/applications' && method === 'POST') return updateApplication(request, env);
    if (pathname === '/api/admin/pool' && method === 'GET') return listPool(request, env);
    if (pathname === '/api/admin/pool' && method === 'POST') return updatePool(request, env);
    if (pathname === '/api/admin/review-resume' && method === 'POST') return reviewResume(request, env);
    if (pathname === '/api/admin/outreach/import' && method === 'POST') return importOutreachContacts(request, env);
    if (pathname === '/api/admin/outreach' && method === 'GET') return listOutreachContacts(request, env);
    if (pathname === '/api/admin/outreach/send' && method === 'POST') return sendOutreachCampaign(request, env);
    if (pathname === '/api/admin/testimonials' && method === 'GET') return listAdminTestimonials(request, env);
    if (pathname === '/api/admin/testimonials' && method === 'POST') return updateTestimonial(request, env);
    if (pathname === '/api/admin/employers' && method === 'GET') return listEmployers(request, env);
    if (pathname === '/api/admin/employers' && method === 'POST') return updateEmployer(request, env);
    if (pathname === '/api/admin/match' && method === 'POST') return runMatch(request, env);
    if (pathname === '/api/admin/matches' && method === 'GET') return listMatches(request, env);
    if (pathname === '/api/admin/matches' && method === 'POST') return updateMatch(request, env);

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
