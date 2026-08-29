-- BridgeDesk — D1 schema
-- ---------------------------------------------------------------------------
-- One database, five tables. This is the whole backend: job applications,
-- the general talent pool, employer requests (single-hire and Hire-a-Team),
-- the admin-visible match scores between the two, and a click-tracking log
-- for the job board.
--
-- HOW TO RUN — Cloudflare dashboard:
--   Storage & Databases -> D1 -> your database -> Console -> paste -> Run
-- Safe to run more than once (every statement is IF NOT EXISTS).
-- ---------------------------------------------------------------------------

-- A candidate applying to one specific scraped job listing.
create table if not exists applications (
  id            integer primary key autoincrement,
  ref           text unique,          -- short human reference, e.g. "BD-7K2M"
  job_id        text,                 -- the scraped listing id
  job_title     text,
  company       text,
  category      text,                 -- Virtual Assistant / Executive Assistant / Personal Assistant / Legal Assistant
  name          text not null,
  email         text not null,
  phone         text,
  resume_url    text,                 -- link to an uploaded resume (R2 or external)
  cover_note    text,
  status        text default 'new',   -- new / reviewed / shortlisted / introduced / declined
  decline_reason text,
  created_at    text default (datetime('now'))
);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_applications_email on applications(email);

-- "Join our Pool" — a candidate submitting a general profile, not tied to a
-- specific listing, so they can be matched against future employer requests.
create table if not exists pool_candidates (
  id                integer primary key autoincrement,
  ref               text unique,
  name              text not null,
  email             text not null,
  phone             text,
  category          text,             -- Virtual Assistant / Executive Assistant / Personal Assistant / Legal Assistant
  years_experience  text,
  skills            text,             -- free text / comma-separated
  rate_expectation  text,             -- e.g. "$8-12/hr" — candidate's own words
  availability      text,             -- e.g. "Full-time, immediate"
  timezone_overlap  text,             -- e.g. "US Eastern, 9am-5pm"
  english_level     text,
  bio               text,
  resume_url        text,
  portfolio_url     text,
  status            text default 'new',   -- new / reviewed / matched / placed
  created_at        text default (datetime('now'))
);
create index if not exists idx_pool_status on pool_candidates(status);
create index if not exists idx_pool_category on pool_candidates(category);

-- An employer's intake — either a single hire or a Hire-a-Team request.
-- There is no fee-agreement gate: the confirmation screen hands the employer
-- a payment link directly, and admin follow-up (matching, introductions)
-- happens after that.
create table if not exists employer_requests (
  id             integer primary key autoincrement,
  ref            text unique,
  tier           text not null,        -- 'single' or 'team'
  company        text not null,
  contact_name   text not null,
  email          text not null,
  phone          text,
  roles_needed   text,                 -- comma-separated categories
  team_size      integer,              -- only meaningful when tier = 'team'
  budget_range   text,
  timeline       text,
  notes          text,
  payment_status text default 'link_sent',  -- link_sent / paid (updated by admin)
  status         text default 'new',       -- new / reviewed / matching / placed / closed
  created_at     text default (datetime('now'))
);
create index if not exists idx_employer_status on employer_requests(status);

-- Admin-visible match scores between a pool candidate and an employer
-- request. Computed by a transparent heuristic (category fit, rate fit,
-- experience, timezone overlap) — never a black box, so admin can always see
-- why a score is what it is.
create table if not exists matches (
  id                   integer primary key autoincrement,
  candidate_id         integer not null references pool_candidates(id),
  employer_request_id  integer not null references employer_requests(id),
  score                integer not null,     -- 0-100
  rationale            text,                 -- short plain-text breakdown of the score
  status               text default 'suggested',  -- suggested / sent / accepted / declined
  created_at           text default (datetime('now'))
);
create index if not exists idx_matches_employer on matches(employer_request_id);
create index if not exists idx_matches_candidate on matches(candidate_id);

-- Click tracking on job board listings — self-hosted, no third-party
-- analytics. Optional: the site still works if this table is never queried.
create table if not exists job_clicks (
  id          integer primary key autoincrement,
  job_id      text,
  job_title   text,
  company     text,
  created_at  text default (datetime('now'))
);
create index if not exists idx_clicks_job on job_clicks(job_id);
