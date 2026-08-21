-- BridgeDesk — job history
-- ---------------------------------------------------------------------------
-- The feed is a snapshot: it is overwritten every day and yesterday is gone.
-- This keeps the record.
--
-- One row per role, ever. first_seen is when it appeared, last_seen is the most
-- recent scrape that still found it, closed_at is when it stopped appearing.
-- That is enough to answer:
--
--   * how long a role stayed open before it was filled
--   * which senior roles closed recently, and at which companies
--   * who is hiring more this quarter than last
--   * which companies entered or left the market
--
-- None of this can be reconstructed later. Every day without it is a day lost.
--
-- HOW TO RUN — Cloudflare dashboard:
--   Storage & Databases → D1 → bridgedesk-db → Console → paste → Run
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

create table if not exists job_history (
  job_id       text primary key,        -- the scraper's stable id for the role
  hub          text,                    -- 'startup' (single hub today)
  company      text,
  company_id   text,
  title        text,
  category     text,                    -- Virtual Assistant | Executive Assistant | Personal Assistant | Legal Assistant
  ph_signal    integer,                 -- 0-3, how strongly the posting reads as open to remote/PH hiring
  level        text,                    -- 'Senior' | 'Mid' | 'Entry'
  location     text,
  comp_min     integer,
  comp_max     integer,
  apply_url    text,
  source       text,                    -- greenhouse | lever | workday | ...
  posted_at    text,                    -- the employer's own date, when given

  first_seen   text not null,           -- first scrape that found it
  last_seen    text not null,           -- most recent scrape that found it
  closed_at    text,                    -- first scrape that did NOT find it
  days_open    integer,                 -- filled in when it closes
  seen_count   integer not null default 1
);

create index if not exists job_history_company_idx  on job_history (company);
create index if not exists job_history_hub_idx      on job_history (hub);
create index if not exists job_history_closed_idx   on job_history (closed_at);
create index if not exists job_history_first_idx    on job_history (first_seen desc);
create index if not exists job_history_level_idx    on job_history (level);

-- A row per scrape, so gaps in the record are visible rather than silent.
-- Without this, a day the scraper failed looks identical to a day every company
-- closed every role — and that would poison the numbers.
create table if not exists scrape_runs (
  id            integer primary key autoincrement,
  ran_at        text not null default (datetime('now')),
  total_roles   integer,
  sources_ok    integer,
  sources_failed integer,
  new_roles     integer,
  closed_roles  integer,
  ok            integer not null default 1
);

create index if not exists scrape_runs_time_idx on scrape_runs (ran_at desc);

-- ---------------------------------------------------------------------------
-- Queries this makes possible:
--
--   -- senior roles filled in the last 30 days
--   select company, title, first_seen, closed_at, days_open
--     from job_history
--    where closed_at > datetime('now','-30 days')
--      and ph_signal >= 2
--    order by closed_at desc;
--
--   -- how long roles stay open, by company
--   select company, count(*) filled, round(avg(days_open)) avg_days
--     from job_history where days_open is not null
--    group by company having filled >= 3 order by avg_days;
--
--   -- who is hiring most right now
--   select company, hub, count(*) open_now
--     from job_history where closed_at is null
--    group by company, hub order by open_now desc;
--
--   -- hiring velocity: roles opened per month
--   select substr(first_seen,1,7) month, hub, count(*) opened
--     from job_history group by month, hub order by month desc;
--
--   -- did the scraper miss a day?
--   select date(ran_at) day, total_roles, sources_failed, ok
--     from scrape_runs order by ran_at desc limit 30;
-- ---------------------------------------------------------------------------
