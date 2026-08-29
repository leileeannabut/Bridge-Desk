/**
 * config.js — scrape targets for run.js
 * ---------------------------------------------------------------------------
 * BridgeDesk — the bridge between startups worldwide and global virtual, executive,
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
    verified: false, method: "dom", atsSlug: null, active: true,
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
    careersUrl: "https://clio.wd3.myworkdayjobs.com/ClioCareerSite", website: "https://www.clio.com",
    state: "Remote (US)", segment: "Legal Practice Management SaaS",
    verified: true, method: "workday", atsSlug: "clio.wd3.myworkdayjobs.com", atsSite: "ClioCareerSite", active: true,
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

  // ---------------------------------------------------------------------------
  // Added to widen scrape coverage — assistant-type roles are rare at any
  // single startup, so total volume depends on having many source companies,
  // not just a few. All unresolved (method: null) until detect-ats.js runs.
  // ---------------------------------------------------------------------------
  { id: "plaid", name: "Plaid", hub: "business", careersUrl: "https://plaid.com/careers/", website: "https://plaid.com", segment: "Financial Data API", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "checkr", name: "Checkr", hub: "business", careersUrl: "https://checkr.com/careers", website: "https://checkr.com", segment: "Background Check Platform", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "papaya-global", name: "Papaya Global", hub: "hr-tech", careersUrl: "https://www.papayaglobal.com/careers/", website: "https://www.papayaglobal.com", segment: "Global Payroll Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "toptal", name: "Toptal", hub: "business", careersUrl: "https://www.toptal.com/careers", website: "https://www.toptal.com", segment: "Freelance Talent Network (fully remote)", verified: false, method: null, atsSlug: null, active: true },
  { id: "athyna", name: "Athyna", hub: "business", careersUrl: "https://athyna.com/careers", website: "https://athyna.com", segment: "Global Talent Matching", verified: false, method: null, atsSlug: null, active: true },
  { id: "brightwheel", name: "Brightwheel", hub: "business", careersUrl: "https://mybrightwheel.com/careers", website: "https://mybrightwheel.com", segment: "Childcare Management Software", verified: false, method: null, atsSlug: null, active: true },
  { id: "papermark", name: "Attentive", hub: "business", careersUrl: "https://www.attentive.com/careers", website: "https://www.attentive.com", segment: "SMS Marketing Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "postscript", name: "Postscript", hub: "business", careersUrl: "https://postscript.io/careers", website: "https://postscript.io", segment: "SMS Marketing for Shopify (remote-first)", verified: false, method: null, atsSlug: null, active: true },
  { id: "gorgias", name: "Gorgias", hub: "business", careersUrl: "https://www.gorgias.com/careers", website: "https://www.gorgias.com", segment: "E-commerce Helpdesk Software", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "clockwise", name: "Clockwise", hub: "saas", careersUrl: "https://www.getclockwise.com/careers", website: "https://www.getclockwise.com", segment: "Calendar Scheduling AI", verified: false, method: null, atsSlug: null, active: true },
  { id: "motion", name: "Motion", hub: "saas", careersUrl: "https://www.usemotion.com/careers", website: "https://www.usemotion.com", segment: "AI Calendar & Task Manager", verified: false, method: null, atsSlug: null, active: true },
  { id: "runway", name: "Runway Financial", hub: "fintech", careersUrl: "https://www.runway.com/careers", website: "https://www.runway.com", segment: "Financial Planning Software", verified: false, method: null, atsSlug: null, active: true },
  { id: "bench-accounting", name: "Bench Accounting", hub: "fintech", careersUrl: "https://bench.co/careers/", website: "https://bench.co", segment: "Bookkeeping Service (remote-first)", verified: false, method: null, atsSlug: null, active: true },
  { id: "brightside", name: "Truework", hub: "fintech", careersUrl: "https://www.truework.com/careers", website: "https://www.truework.com", segment: "Income & Employment Verification", verified: false, method: null, atsSlug: null, active: true },
  { id: "modern-treasury", name: "Modern Treasury", hub: "fintech", careersUrl: "https://www.moderntreasury.com/careers", website: "https://www.moderntreasury.com", segment: "Payment Operations Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "highbeam", name: "Highbeam", hub: "fintech", careersUrl: "https://www.highbeam.co/careers", website: "https://www.highbeam.co", segment: "Banking for E-commerce", verified: false, method: null, atsSlug: null, active: true },
  { id: "clio-legal", name: "Filevine", hub: "legaltech", careersUrl: "https://www.filevine.com/careers/", website: "https://www.filevine.com", segment: "Legal Case Management Software", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "lawgeex", name: "LawGeex", hub: "legaltech", careersUrl: "https://www.lawgeex.com/careers/", website: "https://www.lawgeex.com", segment: "AI Contract Review", verified: false, method: null, atsSlug: null, active: true },
  { id: "juro", name: "Juro", hub: "legaltech", careersUrl: "https://juro.com/careers", website: "https://juro.com", segment: "Contract Collaboration Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "rally-legal", name: "Rally Legal Design", hub: "legaltech", careersUrl: "https://www.rallylegaldesign.com/careers", website: "https://www.rallylegaldesign.com", segment: "Legal Design Consultancy", verified: false, method: null, atsSlug: null, active: true },
  { id: "eve-legal", name: "Eve", hub: "legaltech", careersUrl: "https://www.eve.legal/careers", website: "https://www.eve.legal", segment: "AI Platform for Plaintiff Law Firms", verified: false, method: "greenhouse", atsSlug: "eve", active: true },
  { id: "hellosign", name: "Dropbox Sign (HelloSign)", hub: "legaltech", careersUrl: "https://www.hellosign.com/careers", website: "https://www.hellosign.com", segment: "E-signature Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "pandadoc", name: "PandaDoc", hub: "legaltech", careersUrl: "https://www.pandadoc.com/careers/", website: "https://www.pandadoc.com", segment: "Document Automation & E-signature", verified: false, method: null, atsSlug: null, active: true },
  { id: "hashicorp-alt", name: "Angi (formerly Angie's List)", hub: "business", careersUrl: "https://www.angi.com/careers/", website: "https://www.angi.com", segment: "Home Services Marketplace", verified: false, method: null, atsSlug: null, active: true },
  { id: "thumbtack", name: "Thumbtack", hub: "business", careersUrl: "https://www.thumbtack.com/careers/", website: "https://www.thumbtack.com", segment: "Local Services Marketplace", verified: false, method: null, atsSlug: null, active: true },
  { id: "sonder", name: "Sonder", hub: "business", careersUrl: "https://www.sonder.com/careers", website: "https://www.sonder.com", segment: "Tech-Enabled Hospitality", verified: false, method: null, atsSlug: null, active: true },
  { id: "lattice", name: "Lattice", hub: "hr-tech", careersUrl: "https://lattice.com/careers", website: "https://lattice.com", segment: "Performance Management Software", verified: false, method: null, atsSlug: null, active: true },
  { id: "culture-amp", name: "Culture Amp", hub: "hr-tech", careersUrl: "https://www.cultureamp.com/careers", website: "https://www.cultureamp.com", segment: "Employee Experience Platform", verified: false, method: "greenhouse", atsSlug: "cultureamp", active: true },
  { id: "greenhouse-software", name: "Greenhouse Software", hub: "hr-tech", careersUrl: "https://www.greenhouse.com/careers", website: "https://www.greenhouse.com", segment: "Recruiting Software", verified: false, method: null, atsSlug: null, active: true },
  { id: "ashby", name: "Ashby", hub: "hr-tech", careersUrl: "https://www.ashbyhq.com/careers", website: "https://www.ashbyhq.com", segment: "Recruiting Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "gem", name: "Gem", hub: "hr-tech", careersUrl: "https://www.gem.com/careers", website: "https://www.gem.com", segment: "Recruiting CRM", verified: false, method: null, atsSlug: null, active: true },
  { id: "levels-fyi", name: "Levels.fyi", hub: "hr-tech", careersUrl: "https://www.levels.fyi/careers", website: "https://www.levels.fyi", segment: "Compensation Data Platform", verified: false, method: null, atsSlug: null, active: true },
  { id: "hopin", name: "RB2B", hub: "saas", careersUrl: "https://www.rb2b.com/careers", website: "https://www.rb2b.com", segment: "Website Visitor Identification", verified: false, method: null, atsSlug: null, active: true },
  { id: "close-crm", name: "Close", hub: "saas", careersUrl: "https://close.com/careers/", website: "https://close.com", segment: "CRM for Startups (fully remote)", verified: false, method: null, atsSlug: null, active: true },
  { id: "float-com", name: "Float", hub: "saas", careersUrl: "https://www.float.com/careers", website: "https://www.float.com", segment: "Resource Scheduling Software", verified: false, method: null, atsSlug: null, active: true },
  { id: "timely-app", name: "Timely", hub: "saas", careersUrl: "https://timelyapp.com/careers", website: "https://timelyapp.com", segment: "Automatic Time Tracking (remote-first)", verified: false, method: null, atsSlug: null, active: true },
  { id: "hubstaff", name: "Hubstaff", hub: "saas", careersUrl: "https://hubstaff.com/jobs", website: "https://hubstaff.com", segment: "Time Tracking & Workforce Software", verified: false, method: null, atsSlug: null, active: true },

  // ---------------------------------------------------------------------------
  // Global expansion — real startups headquartered outside the US, added so
  // the scraper isn't US-only. Same honesty rule as everywhere else in this
  // file: method stays null until scripts/detect-ats.js (or a human) confirms
  // it against the company's live careers page.
  // ---------------------------------------------------------------------------

  // United Kingdom
  { id: "monzo", name: "Monzo", hub: "fintech", careersUrl: "https://monzo.com/careers/", website: "https://monzo.com", segment: "Digital Bank", country: "United Kingdom", verified: false, method: "greenhouse", atsSlug: "monzo", active: true },
  { id: "gocardless", name: "GoCardless", hub: "fintech", careersUrl: "https://gocardless.com/careers/", website: "https://gocardless.com", segment: "Recurring Payments Platform", country: "United Kingdom", verified: false, method: "greenhouse", atsSlug: "gocardless", active: true },
  { id: "wise-plc", name: "Wise", hub: "fintech", careersUrl: "https://wise.jobs/", website: "https://wise.com", segment: "International Money Transfer", country: "United Kingdom", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "typeform", name: "Typeform", hub: "saas", careersUrl: "https://www.typeform.com/careers/", website: "https://www.typeform.com", segment: "Online Forms & Surveys", country: "Spain", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "productboard", name: "Productboard", hub: "saas", careersUrl: "https://www.productboard.com/careers/", website: "https://www.productboard.com", segment: "Product Management Platform", country: "Czech Republic / US", verified: false, method: null, atsSlug: null, active: true },

  // Canada
  { id: "shopify", name: "Shopify", hub: "saas", careersUrl: "https://www.shopify.com/careers", website: "https://www.shopify.com", segment: "E-commerce Platform (remote-first)", country: "Canada", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "wealthsimple", name: "Wealthsimple", hub: "fintech", careersUrl: "https://www.wealthsimple.com/en-ca/careers", website: "https://www.wealthsimple.com", segment: "Personal Finance Platform", country: "Canada", verified: false, method: null, atsSlug: null, active: true },
  { id: "clearco", name: "Clearco", hub: "fintech", careersUrl: "https://clear.co/careers/", website: "https://clear.co", segment: "Revenue-Based Financing", country: "Canada", verified: false, method: "dom", atsSlug: null, active: true },

  // Singapore
  { id: "carousell", name: "Carousell", hub: "business", careersUrl: "https://careers.carousell.com/", website: "https://www.carousell.com", segment: "Classifieds Marketplace", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },
  { id: "ninja-van", name: "Ninja Van", hub: "business", careersUrl: "https://www.ninjavan.co/en-sg/careers", website: "https://www.ninjavan.co", segment: "Logistics & Last-Mile Delivery", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },
  { id: "aspire-sg", name: "Aspire", hub: "fintech", careersUrl: "https://aspireapp.com/careers", website: "https://aspireapp.com", segment: "Business Banking Platform", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },
  { id: "endowus", name: "Endowus", hub: "fintech", careersUrl: "https://endowus.com/careers", website: "https://endowus.com", segment: "Digital Wealth Platform", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },
  { id: "carro", name: "Carro", hub: "business", careersUrl: "https://www.carro.co/careers", website: "https://www.carro.co", segment: "Used Car Marketplace", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },

  // Malaysia
  { id: "airasia-move", name: "airasia MOVE", hub: "business", careersUrl: "https://careers.airasia.com/", website: "https://www.airasia.com", segment: "Travel & Super App", country: "Malaysia", verified: false, method: null, atsSlug: null, active: true },
  { id: "fave", name: "Fave", hub: "business", careersUrl: "https://www.myfave.com/careers", website: "https://www.myfave.com", segment: "Payments & Rewards App", country: "Malaysia", verified: false, method: null, atsSlug: null, active: true },
  { id: "carsome", name: "Carsome", hub: "business", careersUrl: "https://www.carsome.my/careers", website: "https://www.carsome.my", segment: "Used Car Marketplace", country: "Malaysia", verified: false, method: null, atsSlug: null, active: true },

  // Australia
  { id: "canva", name: "Canva", hub: "saas", careersUrl: "https://www.canva.com/careers/", website: "https://www.canva.com", segment: "Design Platform", country: "Australia", verified: false, method: null, atsSlug: null, active: true },
  { id: "safetyculture", name: "SafetyCulture", hub: "business", careersUrl: "https://safetyculture.com/careers/", website: "https://safetyculture.com", segment: "Workplace Safety Software", country: "Australia", verified: false, method: null, atsSlug: null, active: true },
  { id: "airwallex", name: "Airwallex", hub: "fintech", careersUrl: "https://www.airwallex.com/careers", website: "https://www.airwallex.com", segment: "Global Business Payments", country: "Australia", verified: false, method: "dom", atsSlug: null, active: true },

  // ---------------------------------------------------------------------------
  // Global expansion, round 2 — the site's own copy promises roles "worldwide,"
  // so the target list needs to look like that, not like a US board with a
  // handful of exceptions bolted on. Adds fully-remote and remote-friendly
  // startups headquartered across Europe, Latin America, the Middle East,
  // Africa, and the rest of Asia-Pacific. Same rule as every entry above:
  // real companies, unverified ATS method, confirm each token by hand or with
  // scripts/detect-ats.js before trusting it.
  // ---------------------------------------------------------------------------

  // Fully distributed / no single HQ that matters for hiring
  // (Deel and Remote already appear above in the US section — not repeated here)
  { id: "gitlab", name: "GitLab", hub: "saas", careersUrl: "https://about.gitlab.com/jobs/", website: "https://about.gitlab.com", segment: "DevOps Platform (all-remote)", country: "Global / Remote", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "andela", name: "Andela", hub: "business", careersUrl: "https://andela.com/careers/", website: "https://andela.com", segment: "Global Remote Talent Network", country: "Global / Remote", verified: false, method: null, atsSlug: null, active: true },

  // Germany
  { id: "n26", name: "N26", hub: "fintech", careersUrl: "https://n26.com/en/careers", website: "https://n26.com", segment: "Digital Bank", country: "Germany", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "personio", name: "Personio", hub: "hr-tech", careersUrl: "https://www.personio.com/career/", website: "https://www.personio.com", segment: "HR Software", country: "Germany", verified: false, method: null, atsSlug: null, active: true },
  { id: "getyourguide", name: "GetYourGuide", hub: "business", careersUrl: "https://careers.getyourguide.com/", website: "https://www.getyourguide.com", segment: "Travel Experiences Marketplace", country: "Germany", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "celonis", name: "Celonis", hub: "saas", careersUrl: "https://www.celonis.com/careers/", website: "https://www.celonis.com", segment: "Process Mining Software", country: "Germany", verified: false, method: null, atsSlug: null, active: true },

  // Sweden
  { id: "klarna", name: "Klarna", hub: "fintech", careersUrl: "https://www.klarna.com/careers/", website: "https://www.klarna.com", segment: "Buy Now, Pay Later / Fintech", country: "Sweden", verified: false, method: null, atsSlug: null, active: true },
  { id: "spotify", name: "Spotify", hub: "business", careersUrl: "https://www.lifeatspotify.com/jobs", website: "https://www.spotify.com", segment: "Audio Streaming", country: "Sweden", verified: false, method: null, atsSlug: null, active: true },

  // Netherlands
  { id: "adyen", name: "Adyen", hub: "fintech", careersUrl: "https://www.adyen.com/careers", website: "https://www.adyen.com", segment: "Payments Platform", country: "Netherlands", verified: false, method: null, atsSlug: null, active: true },
  { id: "mollie", name: "Mollie", hub: "fintech", careersUrl: "https://www.mollie.com/careers", website: "https://www.mollie.com", segment: "Payments Platform", country: "Netherlands", verified: false, method: null, atsSlug: null, active: true },
  { id: "bunq", name: "Bunq", hub: "fintech", careersUrl: "https://www.bunq.com/careers", website: "https://www.bunq.com", segment: "Digital Bank", country: "Netherlands", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "bird", name: "Bird (MessageBird)", hub: "saas", careersUrl: "https://bird.com/careers", website: "https://bird.com", segment: "Customer Communications Platform", country: "Netherlands", verified: false, method: null, atsSlug: null, active: true },

  // France
  { id: "qonto", name: "Qonto", hub: "fintech", careersUrl: "https://qonto.com/en/careers", website: "https://qonto.com", segment: "Business Banking", country: "France", verified: false, method: "lever", atsSlug: "qonto", active: true },
  { id: "alan", name: "Alan", hub: "business", careersUrl: "https://alan.com/careers", website: "https://alan.com", segment: "Health Insurance Platform", country: "France", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "payfit", name: "PayFit", hub: "hr-tech", careersUrl: "https://payfit.com/careers/", website: "https://payfit.com", segment: "Payroll & HR Software", country: "France", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "spendesk", name: "Spendesk", hub: "fintech", careersUrl: "https://spendesk.com/careers", website: "https://spendesk.com", segment: "Spend Management Software", country: "France", verified: false, method: "dom", atsSlug: null, active: true },

  // Ireland
  { id: "intercom", name: "Intercom", hub: "saas", careersUrl: "https://www.intercom.com/careers", website: "https://www.intercom.com", segment: "Customer Messaging Platform", country: "Ireland", verified: false, method: "greenhouse", atsSlug: "intercom", active: true },
  { id: "workhuman", name: "Workhuman", hub: "hr-tech", careersUrl: "https://www.workhuman.com/careers", website: "https://www.workhuman.com", segment: "Employee Recognition Software", country: "Ireland", verified: false, method: "workday", atsSlug: "workhuman.wd1.myworkdayjobs.com", active: true },

  // Estonia / Baltics
  { id: "bolt-eu", name: "Bolt", hub: "business", careersUrl: "https://bolt.eu/en/careers/", website: "https://bolt.eu", segment: "Ride-Hailing & Delivery Super App", country: "Estonia", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "pipedrive", name: "Pipedrive", hub: "saas", careersUrl: "https://www.pipedrive.com/en/careers", website: "https://www.pipedrive.com", segment: "CRM Software", country: "Estonia", verified: false, method: null, atsSlug: null, active: true },
  { id: "nordsecurity", name: "Nord Security", hub: "saas", careersUrl: "https://nordsecurity.com/careers", website: "https://nordsecurity.com", segment: "Cybersecurity (NordVPN)", country: "Lithuania", verified: false, method: "dom", atsSlug: null, active: true },

  // Poland
  { id: "booksy", name: "Booksy", hub: "business", careersUrl: "https://booksy.com/en-us/careers", website: "https://booksy.com", segment: "Appointment Booking Platform", country: "Poland", verified: false, method: null, atsSlug: null, active: true },
  { id: "docplanner", name: "Docplanner", hub: "business", careersUrl: "https://www.docplanner.com/careers", website: "https://www.docplanner.com", segment: "Healthcare Booking Platform", country: "Poland", verified: false, method: null, atsSlug: null, active: true },

  // Brazil
  { id: "nubank", name: "Nubank", hub: "fintech", careersUrl: "https://nubank.com.br/en/carreiras/", website: "https://nubank.com.br", segment: "Digital Bank", country: "Brazil", verified: false, method: null, atsSlug: null, active: true },
  { id: "loft-br", name: "Loft", hub: "business", careersUrl: "https://www.loft.com.br/carreiras", website: "https://www.loft.com.br", segment: "Real Estate Platform", country: "Brazil", verified: false, method: null, atsSlug: null, active: true },

  // Mexico
  { id: "kavak", name: "Kavak", hub: "business", careersUrl: "https://www.kavak.com/mx/careers", website: "https://www.kavak.com", segment: "Used Car Marketplace", country: "Mexico", verified: false, method: null, atsSlug: null, active: true },
  { id: "bitso", name: "Bitso", hub: "fintech", careersUrl: "https://bitso.com/careers", website: "https://bitso.com", segment: "Crypto Exchange", country: "Mexico", verified: false, method: null, atsSlug: null, active: true },

  // Colombia
  { id: "rappi", name: "Rappi", hub: "business", careersUrl: "https://about.rappi.com/en/careers", website: "https://www.rappi.com", segment: "Delivery Super App", country: "Colombia", verified: false, method: null, atsSlug: null, active: true },

  // Uruguay
  { id: "dlocal", name: "dLocal", hub: "fintech", careersUrl: "https://dlocal.com/careers/", website: "https://dlocal.com", segment: "Cross-Border Payments", country: "Uruguay", verified: false, method: null, atsSlug: null, active: true },

  // United Arab Emirates
  { id: "careem", name: "Careem", hub: "business", careersUrl: "https://careers.careem.com/", website: "https://www.careem.com", segment: "Ride-Hailing & Delivery Super App", country: "United Arab Emirates", verified: false, method: null, atsSlug: null, active: true },
  { id: "tabby", name: "Tabby", hub: "fintech", careersUrl: "https://tabby.ai/careers", website: "https://tabby.ai", segment: "Buy Now, Pay Later", country: "United Arab Emirates", verified: false, method: null, atsSlug: null, active: true },

  // Nigeria
  { id: "flutterwave", name: "Flutterwave", hub: "fintech", careersUrl: "https://www.flutterwave.com/us/careers", website: "https://flutterwave.com", segment: "Payments Infrastructure", country: "Nigeria", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "paystack", name: "Paystack", hub: "fintech", careersUrl: "https://paystack.com/careers", website: "https://paystack.com", segment: "Payments Infrastructure", country: "Nigeria", verified: false, method: null, atsSlug: null, active: true },

  // Kenya
  { id: "m-kopa", name: "M-KOPA", hub: "fintech", careersUrl: "https://www.m-kopa.com/careers/", website: "https://www.m-kopa.com", segment: "Asset Financing / Fintech", country: "Kenya", verified: false, method: null, atsSlug: null, active: true },

  // India
  { id: "razorpay", name: "Razorpay", hub: "fintech", careersUrl: "https://razorpay.com/jobs/", website: "https://razorpay.com", segment: "Payments Platform", country: "India", verified: false, method: "greenhouse", atsSlug: "razorpaysoftwareprivatelimited", active: true },
  { id: "freshworks", name: "Freshworks", hub: "saas", careersUrl: "https://www.freshworks.com/company/careers/", website: "https://www.freshworks.com", segment: "Customer Engagement Software", country: "India", verified: false, method: null, atsSlug: null, active: true },

  // Indonesia
  { id: "xendit", name: "Xendit", hub: "fintech", careersUrl: "https://www.xendit.co/en/careers/", website: "https://www.xendit.co", segment: "Payments Infrastructure", country: "Indonesia", verified: false, method: null, atsSlug: null, active: true },
  { id: "gotocompany", name: "GoTo Group", hub: "business", careersUrl: "https://www.gotocompany.com/en/career", website: "https://www.gotocompany.com", segment: "Ride-Hailing, E-commerce & Fintech Super App", country: "Indonesia", verified: false, method: null, atsSlug: null, active: true },

  // Japan
  { id: "mercari", name: "Mercari", hub: "business", careersUrl: "https://careers.mercari.com/", website: "https://www.mercari.com", segment: "C2C Marketplace", country: "Japan", verified: false, method: "dom", atsSlug: null, active: true },

  // Singapore (additional)
  { id: "grab", name: "Grab", hub: "business", careersUrl: "https://grab.careers/", website: "https://www.grab.com", segment: "Ride-Hailing, Delivery & Fintech Super App", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },

  // ---------------------------------------------------------------------------
  // Global expansion, round 3 — deepens the still-thin countries from round 2
  // and adds 16 countries with no presence on the board at all yet (CH, AT,
  // DK, NO, FI, IT, PT, ZA, EG, IL, TH, AR, CL, NZ, KR, HK). Same rule as
  // every entry above: real companies, unverified ATS method — confirm with
  // scripts/detect-ats.js before trusting a token.
  // ---------------------------------------------------------------------------

  // United Kingdom (additional)
  { id: "deliveroo", name: "Deliveroo", hub: "business", careersUrl: "https://careers.deliveroo.co.uk/", website: "https://deliveroo.co.uk", segment: "Food Delivery Platform", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "skyscanner", name: "Skyscanner", hub: "business", careersUrl: "https://www.skyscanner.net/about-us/careers", website: "https://www.skyscanner.net", segment: "Travel Search Engine", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "depop", name: "Depop", hub: "business", careersUrl: "https://careers.depop.com/", website: "https://www.depop.com", segment: "Fashion Resale Marketplace", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "starling-bank", name: "Starling Bank", hub: "fintech", careersUrl: "https://www.starlingbank.com/careers/", website: "https://www.starlingbank.com", segment: "Digital Bank", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "octopus-energy", name: "Octopus Energy", hub: "business", careersUrl: "https://octopus.energy/careers/", website: "https://octopus.energy", segment: "Energy Retailer & Tech", country: "United Kingdom", verified: false, method: "lever", atsSlug: "octoenergy", active: true },
  { id: "onfido", name: "Onfido", hub: "saas", careersUrl: "https://onfido.com/careers/", website: "https://onfido.com", segment: "Identity Verification Platform", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "tide-uk", name: "Tide", hub: "fintech", careersUrl: "https://www.tide.co/careers/", website: "https://www.tide.co", segment: "Business Banking", country: "United Kingdom", verified: false, method: "greenhouse", atsSlug: "tide", active: true },
  { id: "curve-uk", name: "Curve", hub: "fintech", careersUrl: "https://www.curve.com/careers/", website: "https://www.curve.com", segment: "Card Aggregation Fintech", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },

  // Canada (additional)
  { id: "hootsuite", name: "Hootsuite", hub: "saas", careersUrl: "https://www.hootsuite.com/careers", website: "https://www.hootsuite.com", segment: "Social Media Management Software", country: "Canada", verified: false, method: null, atsSlug: null, active: true },
  { id: "lightspeed", name: "Lightspeed Commerce", hub: "saas", careersUrl: "https://www.lightspeedhq.com/careers/", website: "https://www.lightspeedhq.com", segment: "POS & E-commerce Platform", country: "Canada", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "faire", name: "Faire", hub: "business", careersUrl: "https://www.faire.com/careers", website: "https://www.faire.com", segment: "Wholesale Marketplace", country: "Canada / US", verified: false, method: null, atsSlug: null, active: true },
  { id: "borrowell", name: "Borrowell", hub: "fintech", careersUrl: "https://borrowell.com/careers", website: "https://borrowell.com", segment: "Credit Score & Personal Finance", country: "Canada", verified: false, method: null, atsSlug: null, active: true },
  { id: "ada-support", name: "Ada", hub: "saas", careersUrl: "https://www.ada.cx/careers/", website: "https://www.ada.cx", segment: "AI Customer Service Platform", country: "Canada", verified: false, method: null, atsSlug: null, active: true },

  // Australia (additional)
  { id: "atlassian", name: "Atlassian", hub: "saas", careersUrl: "https://www.atlassian.com/company/careers", website: "https://www.atlassian.com", segment: "Collaboration Software (Jira, Trello)", country: "Australia", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "deputy", name: "Deputy", hub: "saas", careersUrl: "https://www.deputy.com/careers", website: "https://www.deputy.com", segment: "Workforce Management Software", country: "Australia", verified: false, method: null, atsSlug: null, active: true },
  { id: "employment-hero", name: "Employment Hero", hub: "hr-tech", careersUrl: "https://employmenthero.com/careers/", website: "https://employmenthero.com", segment: "HR & Payroll Platform", country: "Australia", verified: false, method: null, atsSlug: null, active: true },

  // India
  { id: "zomato", name: "Zomato", hub: "business", careersUrl: "https://www.zomato.com/careers", website: "https://www.zomato.com", segment: "Food Delivery Platform", country: "India", verified: false, method: null, atsSlug: null, active: true },
  { id: "meesho", name: "Meesho", hub: "business", careersUrl: "https://www.meesho.io/careers", website: "https://www.meesho.com", segment: "Social Commerce Marketplace", country: "India", verified: false, method: null, atsSlug: null, active: true },
  { id: "cred", name: "CRED", hub: "fintech", careersUrl: "https://careers.cred.club/", website: "https://cred.club", segment: "Credit Card Rewards & Fintech", country: "India", verified: false, method: null, atsSlug: null, active: true },
  { id: "postman", name: "Postman", hub: "saas", careersUrl: "https://www.postman.com/careers/", website: "https://www.postman.com", segment: "API Development Platform", country: "India", verified: false, method: null, atsSlug: null, active: true },
  { id: "chargebee", name: "Chargebee", hub: "fintech", careersUrl: "https://www.chargebee.com/careers/", website: "https://www.chargebee.com", segment: "Subscription Billing Platform", country: "India", verified: false, method: "dom", atsSlug: null, active: true },

  // Singapore (additional)
  { id: "trax-sg", name: "Trax", hub: "saas", careersUrl: "https://traxretail.com/careers/", website: "https://traxretail.com", segment: "Retail Analytics / Computer Vision", country: "Singapore", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "patsnap", name: "PatSnap", hub: "saas", careersUrl: "https://www.patsnap.com/careers", website: "https://www.patsnap.com", segment: "IP & Innovation Intelligence Platform", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },
  { id: "shopback", name: "ShopBack", hub: "business", careersUrl: "https://www.shopback.com/careers", website: "https://www.shopback.com", segment: "Cashback & Rewards Platform", country: "Singapore", verified: false, method: null, atsSlug: null, active: true },

  // Indonesia (additional)
  { id: "ajaib", name: "Ajaib", hub: "fintech", careersUrl: "https://ajaib.co.id/careers", website: "https://ajaib.co.id", segment: "Retail Investment Platform", country: "Indonesia", verified: false, method: null, atsSlug: null, active: true },
  { id: "oy-indonesia", name: "OY! Indonesia", hub: "fintech", careersUrl: "https://oyindonesia.com/careers", website: "https://oyindonesia.com", segment: "Payments Infrastructure", country: "Indonesia", verified: false, method: null, atsSlug: null, active: true },

  // Nigeria (additional)
  { id: "kuda", name: "Kuda", hub: "fintech", careersUrl: "https://kuda.com/careers/", website: "https://kuda.com", segment: "Digital Bank", country: "Nigeria", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "moniepoint", name: "Moniepoint", hub: "fintech", careersUrl: "https://moniepoint.com/careers", website: "https://moniepoint.com", segment: "Business Banking & Payments", country: "Nigeria", verified: false, method: null, atsSlug: null, active: true },

  // Brazil (additional)
  { id: "ifood", name: "iFood", hub: "business", careersUrl: "https://carreiras.ifood.com.br/", website: "https://www.ifood.com.br", segment: "Food Delivery Platform", country: "Brazil", verified: false, method: "greenhouse", atsSlug: "ifoodcarreiras", active: true },
  { id: "quintoandar", name: "QuintoAndar", hub: "business", careersUrl: "https://www.quintoandar.com.br/carreiras", website: "https://www.quintoandar.com.br", segment: "Real Estate Rental Platform", country: "Brazil", verified: false, method: null, atsSlug: null, active: true },
  { id: "creditas", name: "Creditas", hub: "fintech", careersUrl: "https://www.creditas.com/carreiras", website: "https://www.creditas.com", segment: "Secured Lending Platform", country: "Brazil", verified: false, method: null, atsSlug: null, active: true },

  // Mexico (additional)
  { id: "clara-mx", name: "Clara", hub: "fintech", careersUrl: "https://www.clara.com/careers", website: "https://www.clara.com", segment: "Corporate Card & Spend Management", country: "Mexico", verified: false, method: "greenhouse", atsSlug: "clara", active: true },

  // United Arab Emirates (additional)
  { id: "kitopi", name: "Kitopi", hub: "business", careersUrl: "https://kitopi.com/careers/", website: "https://kitopi.com", segment: "Cloud Kitchen Platform", country: "United Arab Emirates", verified: false, method: null, atsSlug: null, active: true },
  { id: "property-finder", name: "Property Finder", hub: "business", careersUrl: "https://www.propertyfinder.com/careers", website: "https://www.propertyfinder.com", segment: "Real Estate Marketplace", country: "United Arab Emirates", verified: false, method: "dom", atsSlug: null, active: true },

  // Switzerland
  { id: "smallpdf", name: "Smallpdf", hub: "saas", careersUrl: "https://smallpdf.com/careers", website: "https://smallpdf.com", segment: "PDF Tools SaaS", country: "Switzerland", verified: false, method: null, atsSlug: null, active: true },
  { id: "scandit", name: "Scandit", hub: "saas", careersUrl: "https://www.scandit.com/careers/", website: "https://www.scandit.com", segment: "Mobile Computer Vision / Barcode Scanning", country: "Switzerland", verified: false, method: null, atsSlug: null, active: true },

  // Austria
  { id: "bitpanda", name: "Bitpanda", hub: "fintech", careersUrl: "https://www.bitpanda.com/en/careers", website: "https://www.bitpanda.com", segment: "Crypto & Investing Platform", country: "Austria", verified: false, method: null, atsSlug: null, active: true },
  { id: "gostudent", name: "GoStudent", hub: "business", careersUrl: "https://gostudent.org/careers", website: "https://gostudent.org", segment: "Online Tutoring Platform", country: "Austria", verified: false, method: null, atsSlug: null, active: true },

  // Denmark
  { id: "pleo", name: "Pleo", hub: "fintech", careersUrl: "https://www.pleo.io/en/careers", website: "https://www.pleo.io", segment: "Company Card & Spend Management", country: "Denmark", verified: false, method: null, atsSlug: null, active: true },
  { id: "vivino", name: "Vivino", hub: "business", careersUrl: "https://www.vivino.com/careers", website: "https://www.vivino.com", segment: "Wine Marketplace & Social App", country: "Denmark", verified: false, method: null, atsSlug: null, active: true },
  { id: "templafy", name: "Templafy", hub: "saas", careersUrl: "https://www.templafy.com/careers/", website: "https://www.templafy.com", segment: "Document Generation Platform", country: "Denmark", verified: false, method: "dom", atsSlug: null, active: true },

  // Norway
  { id: "cognite", name: "Cognite", hub: "saas", careersUrl: "https://www.cognite.com/en/careers", website: "https://www.cognite.com", segment: "Industrial DataOps Platform", country: "Norway", verified: false, method: null, atsSlug: null, active: true },
  { id: "kahoot", name: "Kahoot!", hub: "saas", careersUrl: "https://kahoot.com/careers/", website: "https://kahoot.com", segment: "Learning & Quiz Platform", country: "Norway", verified: false, method: null, atsSlug: null, active: true },

  // Finland
  { id: "wolt", name: "Wolt", hub: "business", careersUrl: "https://careers.wolt.com/", website: "https://wolt.com", segment: "Delivery Super App", country: "Finland", verified: false, method: null, atsSlug: null, active: true },
  { id: "supercell", name: "Supercell", hub: "business", careersUrl: "https://supercell.com/en/careers/", website: "https://supercell.com", segment: "Mobile Gaming Studio", country: "Finland", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "smartly-io", name: "Smartly.io", hub: "saas", careersUrl: "https://www.smartly.io/careers", website: "https://www.smartly.io", segment: "Social Advertising Automation", country: "Finland", verified: false, method: "greenhouse", atsSlug: "smartlyio", active: true },

  // Italy
  { id: "satispay", name: "Satispay", hub: "fintech", careersUrl: "https://www.satispay.com/en-it/careers/", website: "https://www.satispay.com", segment: "Mobile Payments Platform", country: "Italy", verified: false, method: null, atsSlug: null, active: true },
  { id: "musixmatch", name: "Musixmatch", hub: "saas", careersUrl: "https://www.musixmatch.com/careers", website: "https://www.musixmatch.com", segment: "Lyrics & Music Data Platform", country: "Italy", verified: false, method: null, atsSlug: null, active: true },

  // Portugal
  { id: "talkdesk", name: "Talkdesk", hub: "saas", careersUrl: "https://www.talkdesk.com/careers/", website: "https://www.talkdesk.com", segment: "Cloud Contact Center Software", country: "Portugal", verified: false, method: "greenhouse", atsSlug: "talkdesk2", active: true },
  { id: "feedzai", name: "Feedzai", hub: "fintech", careersUrl: "https://feedzai.com/careers/", website: "https://feedzai.com", segment: "Fraud Prevention AI", country: "Portugal", verified: false, method: null, atsSlug: null, active: true },
  { id: "unbabel", name: "Unbabel", hub: "saas", careersUrl: "https://unbabel.com/careers/", website: "https://unbabel.com", segment: "AI Translation Platform", country: "Portugal", verified: false, method: null, atsSlug: null, active: true },

  // South Africa
  { id: "yoco", name: "Yoco", hub: "fintech", careersUrl: "https://www.yoco.com/za/careers/", website: "https://www.yoco.com", segment: "Card Payments for SMEs", country: "South Africa", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "naked-insurance", name: "Naked Insurance", hub: "fintech", careersUrl: "https://naked.insure/careers", website: "https://naked.insure", segment: "Digital Insurance", country: "South Africa", verified: false, method: null, atsSlug: null, active: true },
  { id: "luno", name: "Luno", hub: "fintech", careersUrl: "https://www.luno.com/en/careers", website: "https://www.luno.com", segment: "Crypto Exchange", country: "South Africa", verified: false, method: null, atsSlug: null, active: true },

  // Egypt
  { id: "fawry", name: "Fawry", hub: "fintech", careersUrl: "https://fawry.com/careers/", website: "https://fawry.com", segment: "Payments Infrastructure", country: "Egypt", verified: false, method: null, atsSlug: null, active: true },
  { id: "maxab", name: "MaxAB", hub: "business", careersUrl: "https://www.maxab.io/careers", website: "https://www.maxab.io", segment: "B2B Food & Grocery Marketplace", country: "Egypt", verified: false, method: null, atsSlug: null, active: true },
  { id: "swvl", name: "Swvl", hub: "business", careersUrl: "https://www.swvl.com/careers", website: "https://www.swvl.com", segment: "Mass Transit Booking Platform", country: "Egypt", verified: false, method: null, atsSlug: null, active: true },

  // Israel
  { id: "wix", name: "Wix", hub: "saas", careersUrl: "https://www.wix.com/jobs/", website: "https://www.wix.com", segment: "Website Builder Platform", country: "Israel", verified: false, method: null, atsSlug: null, active: true },
  { id: "monday-com", name: "monday.com", hub: "saas", careersUrl: "https://monday.com/careers/", website: "https://monday.com", segment: "Work OS / Project Management", country: "Israel", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "fiverr", name: "Fiverr", hub: "business", careersUrl: "https://www.fiverr.com/careers", website: "https://www.fiverr.com", segment: "Freelance Services Marketplace", country: "Israel", verified: false, method: null, atsSlug: null, active: true },
  { id: "melio", name: "Melio", hub: "fintech", careersUrl: "https://www.meliopayments.com/careers", website: "https://www.meliopayments.com", segment: "B2B Payments Platform", country: "Israel", verified: false, method: null, atsSlug: null, active: true },

  // Thailand
  { id: "ascend-money", name: "Ascend Money", hub: "fintech", careersUrl: "https://www.ascendmoney.co/careers", website: "https://www.ascendmoney.co", segment: "Digital Financial Services (TrueMoney)", country: "Thailand", verified: false, method: null, atsSlug: null, active: true },
  { id: "flash-express", name: "Flash Express", hub: "business", careersUrl: "https://www.flashexpress.com/careers/", website: "https://www.flashexpress.com", segment: "Logistics & Delivery", country: "Thailand", verified: false, method: null, atsSlug: null, active: true },

  // Argentina
  { id: "mercadolibre", name: "Mercado Libre", hub: "business", careersUrl: "https://careers.mercadolibre.com/", website: "https://www.mercadolibre.com", segment: "E-commerce Marketplace", country: "Argentina", verified: false, method: null, atsSlug: null, active: true },
  { id: "uala", name: "Ualá", hub: "fintech", careersUrl: "https://www.uala.com.ar/careers", website: "https://www.uala.com.ar", segment: "Digital Wallet & Banking", country: "Argentina", verified: false, method: null, atsSlug: null, active: true },

  // Chile
  { id: "notco", name: "NotCo", hub: "business", careersUrl: "https://www.notco.com/careers", website: "https://www.notco.com", segment: "Food Tech / Plant-Based Products", country: "Chile", verified: false, method: null, atsSlug: null, active: true },
  { id: "betterfly", name: "Betterfly", hub: "hr-tech", careersUrl: "https://www.betterfly.com/careers", website: "https://www.betterfly.com", segment: "Employee Wellbeing Platform", country: "Chile", verified: false, method: null, atsSlug: null, active: true },

  // New Zealand
  { id: "xero", name: "Xero", hub: "fintech", careersUrl: "https://www.xero.com/careers/", website: "https://www.xero.com", segment: "Cloud Accounting Software", country: "New Zealand", verified: false, method: null, atsSlug: null, active: true },

  // South Korea
  { id: "toss", name: "Toss", hub: "fintech", careersUrl: "https://toss.im/career", website: "https://toss.im", segment: "Mobile Finance Super App", country: "South Korea", verified: false, method: null, atsSlug: null, active: true },
  { id: "woowa-brothers", name: "Woowa Brothers (Baemin)", hub: "business", careersUrl: "https://www.woowahan.com/en/careers", website: "https://www.woowahan.com", segment: "Food Delivery Platform", country: "South Korea", verified: false, method: null, atsSlug: null, active: true },

  // Hong Kong
  { id: "klook", name: "Klook", hub: "business", careersUrl: "https://www.klook.com/en-US/careers/", website: "https://www.klook.com", segment: "Travel Experiences Marketplace", country: "Hong Kong", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "gogox", name: "GoGoX", hub: "business", careersUrl: "https://www.gogox.com/en/careers/", website: "https://www.gogox.com", segment: "On-Demand Logistics", country: "Hong Kong", verified: false, method: null, atsSlug: null, active: true },

  // ---------------------------------------------------------------------------
  // Dedicated VA / EA / PA / Legal VA staffing & outsourcing agencies. These
  // companies' entire business is placing assistants with clients, so a
  // single agency's careers page posts far more VA/EA/PA roles per month
  // than a typical venture-backed startup that hires one EA a year. Missing
  // this category was a real gap — added deliberately, not just to pad
  // count. Same rule as everywhere else here: unverified starter list,
  // method: null until detect-ats.js confirms it.
  // ---------------------------------------------------------------------------
  { id: "athena", name: "Athena", hub: "business", careersUrl: "https://athenago.wd108.myworkdayjobs.com/en-US/athena", website: "https://www.athena.com", segment: "Executive Assistant Staffing & Training", country: "Philippines", verified: true, method: "workday", atsSlug: "athenago.wd108.myworkdayjobs.com", atsSite: "athena", active: true },
  { id: "boldly", name: "Boldly", hub: "business", careersUrl: "https://www.boldly.com/careers/", website: "https://www.boldly.com", segment: "Premium Virtual Staffing (EA/VA/Marketing)", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "belay", name: "BELAY", hub: "business", careersUrl: "https://belaysolutions.com/careers/", website: "https://belaysolutions.com", segment: "Virtual Assistant / Bookkeeping / Social Media Staffing", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "time-etc", name: "Time etc", hub: "business", careersUrl: "https://web.timeetc.com/careers/", website: "https://www.timeetc.com", segment: "Virtual Assistant Staffing", country: "United Kingdom", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "wing-assistant", name: "Wing Assistant", hub: "business", careersUrl: "https://www.wingassistant.com/careers", website: "https://www.wingassistant.com", segment: "Virtual Assistant Staffing", country: "United States", verified: false, method: "lever", atsSlug: "wing", active: true },
  { id: "prialto", name: "Prialto", hub: "business", careersUrl: "https://www.prialto.com/careers", website: "https://www.prialto.com", segment: "Managed Virtual Assistant Teams", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "myoutdesk", name: "MyOutDesk", hub: "business", careersUrl: "https://www.myoutdesk.com/careers/", website: "https://www.myoutdesk.com", segment: "Virtual Assistant Staffing (Real Estate focus)", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "worldwide101", name: "Worldwide101", hub: "business", careersUrl: "https://www.worldwide101.com/careers", website: "https://www.worldwide101.com", segment: "Remote Executive & Marketing Assistant Staffing", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "virtudesk", name: "Virtudesk", hub: "business", careersUrl: "https://www.virtudesk.com/careers/", website: "https://www.virtudesk.com", segment: "Virtual Assistant Staffing", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "20four7va", name: "20Four7VA", hub: "business", careersUrl: "https://20four7va.com/careers/", website: "https://20four7va.com", segment: "Virtual Assistant Staffing", country: "Philippines", verified: false, method: null, atsSlug: null, active: true },
  { id: "stealth-agents", name: "Stealth Agents", hub: "business", careersUrl: "https://stealthagents.com/careers/", website: "https://stealthagents.com", segment: "Virtual Assistant Staffing", country: "Philippines", verified: false, method: null, atsSlug: null, active: true },
  { id: "wishup", name: "Wishup", hub: "business", careersUrl: "https://wishup.co/careers/", website: "https://wishup.co", segment: "Virtual Assistant Staffing", country: "India", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "uassist-me", name: "Uassist.ME", hub: "business", careersUrl: "https://uassistme.com/careers/", website: "https://uassistme.com", segment: "Bilingual Virtual Assistant Staffing", country: "El Salvador", verified: false, method: null, atsSlug: null, active: true },
  { id: "cyberbacker", name: "Cyberbacker", hub: "business", careersUrl: "https://cyberbacker.com/careers/", website: "https://cyberbacker.com", segment: "Virtual Assistant Staffing (Real Estate focus)", country: "Philippines", verified: false, method: null, atsSlug: null, active: true },
  { id: "great-assistant", name: "Great Assistant", hub: "business", careersUrl: "https://www.greatassistant.com/careers", website: "https://www.greatassistant.com", segment: "Executive Assistant Placement Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "assistantly", name: "Assistantly", hub: "business", careersUrl: "https://www.assistantly.com/careers", website: "https://www.assistantly.com", segment: "Virtual Assistant Staffing", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "fancy-hands", name: "Fancy Hands", hub: "business", careersUrl: "https://www.fancyhands.com/jobs", website: "https://www.fancyhands.com", segment: "On-Demand Virtual Assistant Tasking", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },

  // Legal VA / paralegal-specific staffing (distinct from the legal-tech
  // software companies in the Legal Support hub above — these agencies place
  // remote paralegals and legal assistants directly with law firms).
  { id: "posh-virtual-receptionists", name: "Posh Virtual Receptionists", hub: "legal", careersUrl: "https://posh.com/careers/", website: "https://posh.com", segment: "Virtual Receptionist & Legal Intake Staffing", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "paralegal-bootcamp-staffing", name: "Robert Half Legal", hub: "legal", careersUrl: "https://www.roberthalf.com/us/en/careers", website: "https://www.roberthalf.com", segment: "Legal Staffing Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "hire-an-esquire", name: "Hire an Esquire", hub: "legal", careersUrl: "https://www.hireanesquire.com/careers", website: "https://www.hireanesquire.com", segment: "Legal Talent Marketplace", country: "United States", verified: false, method: null, atsSlug: null, active: true },

  // ---------------------------------------------------------------------------
  // Beyond venture-backed "startups" — agencies, DTC e-commerce brands, real
  // estate, education, telehealth, media, and large scale-ups. These are the
  // kinds of businesses that hire the bulk of real-world Filipino VA/EA work,
  // not just early-stage tech startups. Same rule: unverified starter list.
  // ---------------------------------------------------------------------------

  // Digital marketing / growth agencies (heavy VA/admin/content hirers)
  { id: "single-grain", name: "Single Grain", hub: "business", careersUrl: "https://www.singlegrain.com/careers/", website: "https://www.singlegrain.com", segment: "Digital Marketing Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "np-digital", name: "NP Digital", hub: "business", careersUrl: "https://npdigital.com/careers/", website: "https://npdigital.com", segment: "Digital Marketing Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "webfx", name: "WebFX", hub: "business", careersUrl: "https://www.webfx.com/careers/", website: "https://www.webfx.com", segment: "Digital Marketing Agency", country: "United States", verified: false, method: "lever", atsSlug: "webfx", active: true },
  { id: "ignite-visibility", name: "Ignite Visibility", hub: "business", careersUrl: "https://ignitevisibility.com/careers/", website: "https://ignitevisibility.com", segment: "Digital Marketing Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "directive-consulting", name: "Directive Consulting", hub: "business", careersUrl: "https://directiveconsulting.com/careers/", website: "https://directiveconsulting.com", segment: "B2B Marketing Agency", country: "United States", verified: false, method: null, atsSlug: null, active: true },

  // DTC e-commerce brands (classic Filipino VA client base — order support, content, ads ops)
  { id: "gymshark", name: "Gymshark", hub: "business", careersUrl: "https://careers.gymshark.com/", website: "https://www.gymshark.com", segment: "Fitness Apparel DTC Brand", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "allbirds", name: "Allbirds", hub: "business", careersUrl: "https://www.allbirds.com/pages/careers", website: "https://www.allbirds.com", segment: "Sustainable Footwear DTC Brand", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "ridge-wallet", name: "Ridge", hub: "business", careersUrl: "https://ridge.com/pages/careers", website: "https://ridge.com", segment: "DTC Accessories Brand", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "beardbrand", name: "Beardbrand", hub: "business", careersUrl: "https://www.beardbrand.com/pages/careers", website: "https://www.beardbrand.com", segment: "Men's Grooming DTC Brand", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "chubbies", name: "Chubbies", hub: "business", careersUrl: "https://www.chubbiesshorts.com/pages/careers", website: "https://www.chubbiesshorts.com", segment: "Apparel DTC Brand", country: "United States", verified: false, method: null, atsSlug: null, active: true },

  // Real estate (transaction coordination, listing admin — a major EA/VA niche)
  { id: "keller-williams", name: "Keller Williams", hub: "business", careersUrl: "https://www.kw.com/careers/", website: "https://www.kw.com", segment: "Real Estate Franchise", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "redfin", name: "Redfin", hub: "business", careersUrl: "https://www.redfin.com/about/jobs", website: "https://www.redfin.com", segment: "Real Estate Brokerage Platform", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "opendoor", name: "Opendoor", hub: "business", careersUrl: "https://www.opendoor.com/careers", website: "https://www.opendoor.com", segment: "iBuyer Real Estate Platform", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "compass-re", name: "Compass", hub: "business", careersUrl: "https://www.compass.com/careers/", website: "https://www.compass.com", segment: "Real Estate Brokerage Platform", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },

  // Education / e-learning
  { id: "coursera", name: "Coursera", hub: "saas", careersUrl: "https://www.coursera.org/about/careers", website: "https://www.coursera.org", segment: "Online Learning Platform", country: "United States", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "udemy", name: "Udemy", hub: "saas", careersUrl: "https://about.udemy.com/careers/", website: "https://www.udemy.com", segment: "Online Learning Marketplace", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "skillshare", name: "Skillshare", hub: "saas", careersUrl: "https://www.skillshare.com/en/careers", website: "https://www.skillshare.com", segment: "Creative Online Learning Platform", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "masterclass", name: "MasterClass", hub: "business", careersUrl: "https://www.masterclass.com/careers", website: "https://www.masterclass.com", segment: "Online Learning / Celebrity-taught Courses", country: "United States", verified: false, method: null, atsSlug: null, active: true },

  // Telehealth (patient coordination, intake support)
  { id: "teladoc", name: "Teladoc Health", hub: "business", careersUrl: "https://www.teladochealth.com/careers/", website: "https://www.teladochealth.com", segment: "Telehealth Platform", country: "United States", verified: false, method: "workday", atsSlug: "teladoc.wd503.myworkdayjobs.com", active: true },
  { id: "hims-hers", name: "Hims & Hers", hub: "business", careersUrl: "https://www.hims.com/careers", website: "https://www.hims.com", segment: "Telehealth & Wellness Brand", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "ro-health", name: "Ro", hub: "business", careersUrl: "https://ro.co/careers/", website: "https://ro.co", segment: "Telehealth Platform", country: "United States", verified: false, method: "lever", atsSlug: "ro", active: true },
  { id: "included-health", name: "Included Health", hub: "business", careersUrl: "https://includedhealth.com/careers/", website: "https://includedhealth.com", segment: "Virtual Healthcare Navigation Platform", country: "United States", verified: false, method: "lever", atsSlug: "includedhealth", active: true },

  // Media / publishing (content ops, scheduling, community)
  { id: "vox-media", name: "Vox Media", hub: "business", careersUrl: "https://www.voxmedia.com/careers", website: "https://www.voxmedia.com", segment: "Digital Media Company", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "the-points-guy", name: "The Points Guy", hub: "business", careersUrl: "https://thepointsguy.com/careers/", website: "https://thepointsguy.com", segment: "Travel & Points Media", country: "United States", verified: false, method: null, atsSlug: null, active: true },
  { id: "morning-brew", name: "Morning Brew", hub: "business", careersUrl: "https://www.morningbrew.com/about/careers", website: "https://www.morningbrew.com", segment: "Newsletter Media Company", country: "United States", verified: false, method: null, atsSlug: null, active: true },

  // Large global scale-ups — not early-stage, but real remote/admin demand at volume
  { id: "booking-com", name: "Booking.com", hub: "business", careersUrl: "https://careers.booking.com/", website: "https://www.booking.com", segment: "Online Travel Agency", country: "Netherlands", verified: false, method: "dom", atsSlug: null, active: true },
  { id: "zalando", name: "Zalando", hub: "business", careersUrl: "https://jobs.zalando.com/en/", website: "https://www.zalando.com", segment: "Fashion E-commerce Platform", country: "Germany", verified: false, method: null, atsSlug: null, active: true },
  { id: "asos", name: "ASOS", hub: "business", careersUrl: "https://www.asoscareers.com/", website: "https://www.asos.com", segment: "Fashion E-commerce Retailer", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "farfetch", name: "Farfetch", hub: "business", careersUrl: "https://www.farfetchcareers.com/", website: "https://www.farfetch.com", segment: "Luxury Fashion E-commerce", country: "United Kingdom", verified: false, method: null, atsSlug: null, active: true },
  { id: "trip-com", name: "Trip.com", hub: "business", careersUrl: "https://careers.trip.com/", website: "https://www.trip.com", segment: "Online Travel Agency", country: "China", verified: false, method: null, atsSlug: null, active: true },
  { id: "agoda", name: "Agoda", hub: "business", careersUrl: "https://careersatagoda.com/", website: "https://www.agoda.com", segment: "Online Travel Agency", country: "Thailand", verified: false, method: null, atsSlug: null, active: true },
];
