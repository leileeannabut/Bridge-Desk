/**
 * config.js — scrape targets for run.js
 * ---------------------------------------------------------------------------
 * BridgeDesk — the bridge between US startups and global virtual, executive,
 * personal, and legal assistants.
 *
 * `method` is null on every entry. It cannot be known without fetching each
 * careers page, and a guessed adapter is worse than no adapter — it produces
 * silent zero-result runs that look like "no openings". Run:
 *
 *     node scripts/detect-ats.js
 *
 * which probes each careers URL and writes `method` and `atsSlug` back into
 * this file, printing the ones it could not resolve.
 *
 * Until a company has a method, run.js skips it and logs it as skipped rather
 * than failed. That is why the board shows no live roles on a fresh install:
 * nothing is scrapeable yet.
 *
 * To set one by hand, find the company below and fill in both fields:
 *     method: "greenhouse",   atsSlug: "their-board-token"
 *
 * None of these entries have been verified against a live ATS API yet — they
 * are a starter list of US, venture-backed startups known to hire remote
 * admin/executive/legal support, compiled from public hiring roundups in
 * August 2026. Confirm each token before trusting it; two names can collide
 * (a Greenhouse slug reused by an unrelated company puts their jobs on your
 * board).
 */

/* ---------------------------------------------------------------------------
   ATS methods available, and how to spot each one. When a company fails, open
   its careers page, click through to the listings, and match the URL:

     boards.greenhouse.io/SLUG          -> greenhouse
     jobs.lever.co/SLUG                 -> lever
     TENANT.wdN.myworkdayjobs.com/SITE  -> workday   (needs atsSlug AND atsSite)
     SLUG.breezy.hr                     -> breezy
     jobs.ashbyhq.com/SLUG              -> ashby
     apply.workable.com/SLUG            -> workable
     anything else, server-rendered     -> dom
     JavaScript-rendered, no links      -> cannot be scraped this way
   --------------------------------------------------------------------------- */

export const COMPANIES = [
  // ---------------------------------------------------------------------------
  // Business Support hub - VA / Executive Assistant / Personal Assistant roles
  // at remote-first, venture-backed startups.
  // ---------------------------------------------------------------------------
  {
    id: "zapier", name: "Zapier", hub: "business",
    careersUrl: "https://zapier.com/jobs", website: "https://zapier.com",
    state: "Remote (US)", segment: "Automation SaaS",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "automattic", name: "Automattic", hub: "business",
    careersUrl: "https://automattic.com/work-with-us/", website: "https://automattic.com",
    state: "Remote (US)", segment: "Web Publishing / WordPress.com",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "doist", name: "Doist", hub: "business",
    careersUrl: "https://doist.com/careers", website: "https://doist.com",
    state: "Remote (US)", segment: "Productivity SaaS (Todoist, Twist)",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "buffer", name: "Buffer", hub: "business",
    careersUrl: "https://buffer.com/journey", website: "https://buffer.com",
    state: "Remote (US)", segment: "Social Media Management SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "notion", name: "Notion", hub: "business",
    careersUrl: "https://www.notion.com/careers", website: "https://www.notion.com",
    state: "San Francisco, CA", segment: "Workspace / Productivity SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "linear", name: "Linear", hub: "business",
    careersUrl: "https://linear.app/careers", website: "https://linear.app",
    state: "Remote (US)", segment: "Project & Issue Tracking SaaS",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "superhuman", name: "Superhuman", hub: "business",
    careersUrl: "https://superhuman.com/careers", website: "https://superhuman.com",
    state: "San Francisco, CA", segment: "Email Productivity SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "mercury", name: "Mercury", hub: "business",
    careersUrl: "https://mercury.com/careers", website: "https://mercury.com",
    state: "Remote (US)", segment: "Startup Banking",
    verified: false, method: "greenhouse", atsSlug: "mercury", active: true,
  },
  {
    id: "retool", name: "Retool", hub: "business",
    careersUrl: "https://retool.com/careers", website: "https://retool.com",
    state: "San Francisco, CA", segment: "Internal Tools Platform",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "miro", name: "Miro", hub: "business",
    careersUrl: "https://miro.com/careers/", website: "https://miro.com",
    state: "San Francisco, CA", segment: "Visual Collaboration SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "webflow", name: "Webflow", hub: "business",
    careersUrl: "https://webflow.com/careers", website: "https://webflow.com",
    state: "Remote (US)", segment: "No-Code Web Design SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "coda", name: "Coda", hub: "business",
    careersUrl: "https://coda.io/careers", website: "https://coda.io",
    state: "Remote (US)", segment: "Docs / Productivity SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "airtable", name: "Airtable", hub: "business",
    careersUrl: "https://airtable.com/careers", website: "https://airtable.com",
    state: "San Francisco, CA", segment: "No-Code Database SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "carta", name: "Carta", hub: "business",
    careersUrl: "https://carta.com/careers/", website: "https://carta.com",
    state: "San Francisco, CA", segment: "Cap Table & Equity Management",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "brex", name: "Brex", hub: "business",
    careersUrl: "https://www.brex.com/careers", website: "https://www.brex.com",
    state: "Remote (US)", segment: "Corporate Card & Spend Management",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "ramp", name: "Ramp", hub: "business",
    careersUrl: "https://ramp.com/careers", website: "https://ramp.com",
    state: "New York, NY", segment: "Corporate Card & Spend Management",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "rippling", name: "Rippling", hub: "business",
    careersUrl: "https://www.rippling.com/careers", website: "https://www.rippling.com",
    state: "San Francisco, CA", segment: "HR / IT / Payroll Platform",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "gusto", name: "Gusto", hub: "business",
    careersUrl: "https://gusto.com/about/careers", website: "https://gusto.com",
    state: "Remote (US)", segment: "Payroll & Benefits SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "justworks", name: "Justworks", hub: "business",
    careersUrl: "https://www.justworks.com/careers", website: "https://www.justworks.com",
    state: "New York, NY", segment: "PEO / HR Platform",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "pilot", name: "Pilot.com", hub: "business",
    careersUrl: "https://pilot.com/careers", website: "https://pilot.com",
    state: "San Francisco, CA", segment: "Bookkeeping & Finance-as-a-Service",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "deel", name: "Deel", hub: "business",
    careersUrl: "https://www.deel.com/careers", website: "https://www.deel.com",
    state: "Remote (US)", segment: "Global Payroll & EOR",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "remote-com", name: "Remote", hub: "business",
    careersUrl: "https://remote.com/careers", website: "https://remote.com",
    state: "Remote (US)", segment: "Global Payroll & EOR",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "oyster-hr", name: "Oyster HR", hub: "business",
    careersUrl: "https://www.oysterhr.com/careers", website: "https://www.oysterhr.com",
    state: "Remote (US)", segment: "Global Employment Platform",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "multiplier", name: "Multiplier", hub: "business",
    careersUrl: "https://www.usemultiplier.com/careers", website: "https://www.usemultiplier.com",
    state: "Remote (US)", segment: "Global Employment Platform",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "scale-ai", name: "Scale AI", hub: "business",
    careersUrl: "https://scale.com/careers", website: "https://scale.com",
    state: "San Francisco, CA", segment: "AI Data Infrastructure",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "vercel", name: "Vercel", hub: "business",
    careersUrl: "https://vercel.com/careers", website: "https://vercel.com",
    state: "Remote (US)", segment: "Frontend Cloud Platform",
    verified: false, method: "greenhouse", atsSlug: "vercel", active: true,
  },
  {
    id: "loom", name: "Loom", hub: "business",
    careersUrl: "https://www.loom.com/careers", website: "https://www.loom.com",
    state: "San Francisco, CA", segment: "Async Video Messaging",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "calm", name: "Calm", hub: "business",
    careersUrl: "https://www.calm.com/careers", website: "https://www.calm.com",
    state: "San Francisco, CA", segment: "Mental Wellness App",
    verified: false, method: "greenhouse", atsSlug: "calm", active: true,
  },
  {
    id: "spring-health", name: "Spring Health", hub: "business",
    careersUrl: "https://www.springhealth.com/careers", website: "https://www.springhealth.com",
    state: "New York, NY", segment: "Mental Health Benefits",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "compt", name: "Compt", hub: "business",
    careersUrl: "https://www.compt.io/careers", website: "https://www.compt.io",
    state: "Remote (US)", segment: "Employee Benefits Platform",
    verified: false, method: null, atsSlug: null, active: true,
  },

  // ---------------------------------------------------------------------------
  // Legal Support hub - Legal Assistant / Paralegal roles at legal-tech
  // startups and legal process companies with a remote posture.
  // ---------------------------------------------------------------------------
  {
    id: "ironclad", name: "Ironclad", hub: "legal",
    careersUrl: "https://ironcladapp.com/careers/", website: "https://ironcladapp.com",
    state: "San Francisco, CA", segment: "Contract Lifecycle Management",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "clio", name: "Clio", hub: "legal",
    careersUrl: "https://www.clio.com/about/careers/", website: "https://www.clio.com",
    state: "Remote (US)", segment: "Legal Practice Management SaaS",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "spotdraft", name: "SpotDraft", hub: "legal",
    careersUrl: "https://www.spotdraft.com/careers", website: "https://www.spotdraft.com",
    state: "Remote (US)", segment: "Contract Management Software",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "everlaw", name: "Everlaw", hub: "legal",
    careersUrl: "https://www.everlaw.com/careers/", website: "https://www.everlaw.com",
    state: "Oakland, CA", segment: "E-Discovery & Litigation Software",
    verified: false, method: "dom", atsSlug: null, active: true,
  },
  {
    id: "disco", name: "DISCO", hub: "legal",
    careersUrl: "https://www.csdisco.com/careers", website: "https://www.csdisco.com",
    state: "Austin, TX", segment: "E-Discovery Software",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "rocket-lawyer", name: "Rocket Lawyer", hub: "legal",
    careersUrl: "https://www.rocketlawyer.com/about/careers", website: "https://www.rocketlawyer.com",
    state: "San Francisco, CA", segment: "Consumer Legal Services",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "trellis", name: "Trellis", hub: "legal",
    careersUrl: "https://www.trellis.law/careers", website: "https://www.trellis.law",
    state: "Remote (US)", segment: "Litigation Data & Analytics",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "priori-legal", name: "Priori Legal", hub: "legal",
    careersUrl: "https://www.priorilegal.com/careers", website: "https://www.priorilegal.com",
    state: "New York, NY", segment: "Legal Marketplace / Managed Services",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "athennian", name: "Athennian", hub: "legal",
    careersUrl: "https://www.athennian.com/careers", website: "https://www.athennian.com",
    state: "Remote (US)", segment: "Legal Entity Management Software",
    verified: false, method: null, atsSlug: null, active: true,
  },
  {
    id: "clerky", name: "Clerky", hub: "legal",
    careersUrl: "https://www.clerky.com/careers", website: "https://www.clerky.com",
    state: "San Francisco, CA", segment: "Startup Legal Document Automation",
    verified: false, method: "lever", atsSlug: "clerky", active: true,
  },
];
