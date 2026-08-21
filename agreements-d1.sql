-- BridgeDesk — fee agreements and introduction log
-- ---------------------------------------------------------------------------
-- Two tables that turn "remember not to send" into something the system
-- enforces, and "I introduced them first" into something you can prove.
--
-- HOW TO RUN — Cloudflare dashboard:
--   Storage & Databases → D1 → bridgedesk-db → Console → paste → Run
-- Safe to run more than once.
-- ---------------------------------------------------------------------------

-- Which companies you have terms with. No row here means no introduction can
-- be sent — the Worker refuses rather than trusting you to remember.
create table if not exists fee_agreements (
  company        text primary key,     -- must match applications.company exactly
  contact_name   text,
  contact_email  text,                 -- where introductions go for this company
  fee_percent    real,                 -- e.g. 20.0
  fee_basis      text default 'first-year base salary',
  guarantee_days integer default 90,   -- replacement window
  signed_on      text,                 -- YYYY-MM-DD
  agreement_ref  text,                 -- your own filing reference
  claim_window_months integer default 12,
  notes          text,
  active         integer not null default 1,
  created_at     text not null default (datetime('now'))
);

-- Every introduction, recorded at the moment it is made. This is the evidence:
-- who you named, to whom, on what date, under which agreement.
create table if not exists introductions (
  id             integer primary key autoincrement,
  application_ref text not null,
  candidate_name text not null,        -- the full name, even on a teaser send
  candidate_email text,
  company        text not null,
  job_title      text,
  sent_to        text not null,
  mode           text not null,        -- 'teaser' | 'full'
  fee_percent    real,
  claim_expires  text,                 -- introduction date + claim window
  agreement_ref  text,
  sent_at        text not null default (datetime('now'))
);

create index if not exists introductions_company_idx on introductions (company);
create index if not exists introductions_ref_idx     on introductions (application_ref);
create index if not exists introductions_sent_idx    on introductions (sent_at desc);

-- ---------------------------------------------------------------------------
-- Adding an agreement once you have signed one:
--
--   insert into fee_agreements
--     (company, contact_name, contact_email, fee_percent, signed_on, agreement_ref)
--   values
--     ('Checkr', 'Jane Roe', 'talent@checkr.com', 20.0,
--      '2026-09-01', 'BD-AGR-001');
--
-- Useful queries:
--
--   -- who you can introduce to
--   select company, fee_percent, contact_email from fee_agreements where active = 1;
--
--   -- every introduction still inside its claim window
--   select candidate_name, company, job_title, sent_at, claim_expires
--     from introductions where claim_expires > date('now') order by sent_at desc;
--
--   -- proof you introduced a specific person to a specific company
--   select * from introductions
--    where candidate_name like '%Reyes%' and company = 'Checkr';
-- ---------------------------------------------------------------------------
