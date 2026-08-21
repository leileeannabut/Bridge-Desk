/**
 * config.js — scrape targets for run.js
 * ---------------------------------------------------------------------------
 * BridgeDesk scrapes company career pages directly — not staffing agencies —
 * looking for Virtual Assistant / Executive Assistant / Personal Assistant /
 * Legal Assistant roles at US startups. Every company below is a real,
 * currently-operating startup confirmed to run its own public ATS board
 * (checked against a live posting URL on that board, not guessed from the
 * company name).
 *
 * `method` and `atsSlug` are filled in below because these were confirmed
 * directly. For companies you add later, leave `method: null` and run:
 *
 *     node scripts/detect-ats.js
 *
 * which probes each careers URL and writes `method`/`atsSlug` back into this
 * file. Until a company has a method, run.js skips it and logs it as skipped.
 *
 * IMPORTANT — this board is NOT a US-only filter like a typical job board.
 * The whole point is roles a US company is open to filling remotely,
 * possibly with a Philippines-based hire. run.js keeps anything that reads
 * as remote/US-based-employer and flags each posting with a phSignal score
 * (0–3) based on language in the posting itself — "remote-first", "anywhere",
 * "async", explicit mentions of int'l/PH/contractor-friendly hiring, etc.
 * A low score does not mean "don't pitch it" — it means the posting doesn't
 * say either way, which is most of them. That's what the outreach/agreement
 * flow in worker.js is for.
 */

/* ---------------------------------------------------------------------------
   ATS methods and how to spot each one:

     boards.greenhouse.io/SLUG          → greenhouse
     jobs.lever.co/SLUG                 → lever
     jobs.ashbyhq.com/SLUG              → ashby
     TENANT.wdN.myworkdayjobs.com/SITE  → workday   (needs atsSlug AND atsSite)
     SLUG.breezy.hr                     → breezy
     apply.workable.com/SLUG            → workable
     anything else, server-rendered     → dom

   Slugs are frequently NOT the company's public-facing name. Always confirm
   against a live posting URL before adding a company — a wrong slug puts
   another company's jobs on this board, which is worse than a missing one.
   --------------------------------------------------------------------------- */

export const COMPANIES = [
  // ---------------------------------------------------------------------------
  // Verified against live Greenhouse postings (Aug 2026). All US-founded,
  // funded startups / growth-stage companies known to hire remote EA/VA roles
  // directly rather than through a staffing agency.
  // ---------------------------------------------------------------------------
  {
    id: "turing", name: "Turing", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/turing", website: "https://www.turing.com",
    state: "California", segment: "AI / Remote Engineering Talent Platform",
    verified: true, method: "greenhouse", atsSlug: "turing", active: true,
  },
  {
    id: "cameo", name: "Cameo", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/cameo", website: "https://www.cameo.com",
    state: "Illinois", segment: "Consumer / Creator Marketplace",
    verified: true, method: "greenhouse", atsSlug: "cameo", active: true,
  },
  {
    id: "recidiviz", name: "Recidiviz", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/recidiviz", website: "https://www.recidiviz.org",
    state: "California", segment: "Criminal Justice Data / Civic Tech",
    verified: true, method: "greenhouse", atsSlug: "recidiviz", active: true,
  },
  {
    id: "checkr", name: "Checkr", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/checkr", website: "https://checkr.com",
    state: "California", segment: "Background Check Platform",
    verified: true, method: "greenhouse", atsSlug: "checkr", active: true,
    // Posts EA roles frequently across several execs — good repeat source.
  },
  {
    id: "samsara", name: "Samsara", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/samsara", website: "https://www.samsara.com",
    state: "California", segment: "IoT / Fleet Operations Platform",
    verified: true, method: "greenhouse", atsSlug: "samsara", active: true,
  },
  {
    id: "flex", name: "Flex", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/flex", website: "https://getflex.com",
    state: "New York", segment: "Fintech / Bill Pay",
    verified: true, method: "greenhouse", atsSlug: "flex", active: true,
    // Explicitly remote-friendly beyond the US (AU, BR, IL mentioned) — a
    // strong candidate for a high phSignal.
  },
  {
    id: "panoramaed", name: "Panorama Education", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/panoramaed", website: "https://www.panoramaed.com",
    state: "Massachusetts", segment: "Education Data Platform",
    verified: true, method: "greenhouse", atsSlug: "panoramaed", active: true,
  },
  {
    id: "qualio", name: "Qualio", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/qualio", website: "https://www.qualio.com",
    state: "California", segment: "Quality Management SaaS (Life Sciences)",
    verified: true, method: "greenhouse", atsSlug: "qualio", active: true,
    // All-remote team already spanning North America and Europe.
  },
  {
    id: "grafanalabs", name: "Grafana Labs", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/grafanalabs", website: "https://grafana.com",
    state: "New York", segment: "Open-Source Observability",
    verified: true, method: "greenhouse", atsSlug: "grafanalabs", active: true,
  },
  {
    id: "caribou", name: "Caribou", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/caribou", website: "https://www.gocaribou.com",
    state: "Virginia", segment: "Auto Loan Refinancing Fintech",
    verified: true, method: "greenhouse", atsSlug: "caribou", active: true,
  },
  {
    id: "betterup", name: "BetterUp", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/betterup", website: "https://www.betterup.com",
    state: "California", segment: "Coaching / HR Tech",
    verified: true, method: "greenhouse", atsSlug: "betterup", active: true,
  },
  {
    id: "wisetack", name: "Wisetack", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/wisetack", website: "https://www.wisetack.com",
    state: "California", segment: "Point-of-Sale Lending Fintech",
    verified: true, method: "greenhouse", atsSlug: "wisetack", active: true,
    // Fully remote across a dozen+ US states.
  },
  {
    id: "summer", name: "Summer", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/summer", website: "https://www.joinsummer.com",
    state: "New York", segment: "Student Loan Benefits Platform",
    verified: true, method: "greenhouse", atsSlug: "summer", active: true,
  },
  {
    id: "freshprints", name: "Fresh Prints", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/freshprints", website: "https://www.freshprints.com",
    state: "New York", segment: "Custom Apparel",
    verified: true, method: "greenhouse", atsSlug: "freshprints", active: true,
    // Their own postings have explicitly named India & the Philippines as
    // hiring locations for admin/EA support — about as strong a phSignal
    // source as a direct-ATS company gets.
  },
  {
    id: "underdogfantasy", name: "Underdog Sports", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/underdogfantasy", website: "https://underdogfantasy.com",
    state: "New York", segment: "Sports Media / Fantasy Sports",
    verified: true, method: "greenhouse", atsSlug: "underdogfantasy", active: true,
  },

  // ---------------------------------------------------------------------------
  // Verified against live Ashby postings (Aug 2026).
  // ---------------------------------------------------------------------------
  {
    id: "exa", name: "Exa", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/exa", website: "https://exa.ai",
    state: "California", segment: "AI Search Engine",
    verified: true, method: "ashby", atsSlug: "exa", active: true,
    // Has posted the EA role explicitly open to non-US remote candidates.
  },
  {
    id: "percona", name: "Percona", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/percona", website: "https://www.percona.com",
    state: "North Carolina", segment: "Open-Source Database Software",
    verified: true, method: "ashby", atsSlug: "percona", active: true,
  },
  {
    id: "wrapbook", name: "Wrapbook", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/wrapbook", website: "https://www.wrapbook.com",
    state: "New York", segment: "Production Payroll & Finance",
    verified: true, method: "ashby", atsSlug: "wrapbook", active: true,
  },
  {
    id: "zapier", name: "Zapier", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/zapier", website: "https://zapier.com",
    state: "California", segment: "Workflow Automation SaaS",
    verified: true, method: "ashby", atsSlug: "zapier", active: true,
    // Fully distributed company since day one — reliable repeat source.
  },
  {
    id: "vanta", name: "Vanta", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/vanta", website: "https://www.vanta.com",
    state: "California", segment: "Security & Compliance Automation",
    verified: true, method: "ashby", atsSlug: "vanta", active: true,
  },
  {
    id: "doppler", name: "Doppler", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/doppler", website: "https://www.doppler.com",
    state: "California", segment: "Secrets Management / DevOps",
    verified: true, method: "ashby", atsSlug: "doppler", active: true,
  },
  {
    id: "obsidiansystems", name: "Obsidian Systems", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/obsidiansystems", website: "https://obsidian.systems",
    state: "New York", segment: "Blockchain / Distributed Systems",
    verified: true, method: "ashby", atsSlug: "obsidiansystems", active: true,
    // "Fully remote, global" by their own description — strong phSignal.
  },
  {
    id: "rula", name: "Rula", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/rula", website: "https://www.rula.com",
    state: "California", segment: "Mental Health Access Platform",
    verified: true, method: "ashby", atsSlug: "rula", active: true,
  },
  {
    id: "directive", name: "Directive", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/directive", website: "https://directiveconsulting.com",
    state: "California", segment: "B2B/SaaS Marketing Agency",
    verified: true, method: "ashby", atsSlug: "directive", active: true,
  },
  {
    id: "siena", name: "Siena AI", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/siena", website: "https://siena.cx",
    state: "New York", segment: "AI Customer Service Agents",
    verified: true, method: "ashby", atsSlug: "siena", active: true,
  },

  // ---------------------------------------------------------------------------
  // Add more companies here as you verify them. Copy a block above, change
  // id/name/careersUrl/website/state/segment, and leave method: null until
  // you've confirmed the ATS — or run `node scripts/detect-ats.js` to try.
  // ---------------------------------------------------------------------------
];
