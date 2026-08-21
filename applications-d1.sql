-- BridgeDesk — applications
-- ---------------------------------------------------------------------------
-- Everything a candidate submits, plus the AI review that ran on it. This is
-- personal data — names, contact details, career history — so the browser can
-- INSERT and nothing else. Reading requires the admin key, server-side.
--
-- HOW TO RUN — Cloudflare dashboard:
--   Storage & Databases → D1 → your database → Console → paste → Run
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

create table if not exists applications (
  id            integer primary key autoincrement,
  ref           text unique,        -- short human reference, e.g. "BD-7K2M"

  -- the role
  job_id        text,
  job_title     text,
  company       text,
  hub           text,               -- 'startup' (single hub today)
  category      text,               -- Virtual Assistant | Executive Assistant | Personal Assistant | Legal Assistant
  ph_signal     integer,            -- 0-3, carried over from the scrape
  location      text,
  apply_url     text,               -- where the employer's posting lives

  -- the candidate
  first_name    text,
  middle_initial text,
  last_name     text,
  email         text,
  phone         text,
  current_company  text,
  current_position text,
  linkedin      text,
  background    text,               -- what they wrote in stage two

  -- the review
  score         integer,            -- 0-100
  strengths     text,               -- JSON array
  gaps          text,               -- JSON array
  reviewed_by   text,               -- 'ai' | 'keyword'

  -- the pipeline
  status        text not null default 'new',
                                    -- new | reviewing | interview | offer | hired | passed
  notes         text,
  sent_to_employer_at text,         -- when the employer was notified
  send_error    text,               -- why notification failed, if it did

  created_at    text not null default (datetime('now')),
  updated_at    text not null default (datetime('now'))
);

create index if not exists applications_created_idx on applications (created_at desc);
create index if not exists applications_status_idx  on applications (status);
create index if not exists applications_hub_idx     on applications (hub);
create index if not exists applications_company_idx on applications (company);

-- One person should not be able to fire the same application twice by
-- double-clicking Submit.
create unique index if not exists applications_dedupe_idx
  on applications (email, job_id);

-- ---------------------------------------------------------------------------
-- Queries you can run in this console:
--
--   -- the pipeline at a glance
--   select status, count(*) from applications group by status;
--
--   -- strongest recent candidates
--   select ref, first_name, last_name, job_title, company, score, status
--     from applications order by score desc limit 20;
--
--   -- which companies attract applications
--   select company, hub, count(*) applications, round(avg(score)) avg_score
--     from applications group by company, hub order by applications desc;
--
--   -- anything that failed to reach the employer
--   select ref, company, send_error from applications
--    where send_error is not null order by created_at desc;
-- ---------------------------------------------------------------------------
