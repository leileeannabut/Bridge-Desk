/**
 * config.js — scrape targets for run.js
 * ---------------------------------------------------------------------------
 * BridgeDesk scrapes company career pages directly — not staffing agencies —
 * looking for Virtual Assistant / Executive Assistant / Personal Assistant /
 * Legal Assistant roles at startups worldwide. Every company below is a real,
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
 * IMPORTANT — this board has NO location filter. BridgeDesk connects
 * candidates anywhere with employers anywhere, so run.js keeps every
 * assistant-family posting from every company, tags it with a `region`
 * (United States, Canada, UK & Ireland, Europe, Asia-Pacific, Latin America,
 * Middle East & Africa, Remote / Global, Remote / Unspecified) and scores it
 * 0–3 on how open its own language reads to cross-border hiring
 * (`intl_signal`). A low score does not mean "don't pitch it" — it means the
 * posting doesn't say either way, which is most of them.
 *
 * `country` is the company's HQ country (was `state`, which is kept for the
 * US entries). `verified: true` means someone opened a live posting on that
 * board and confirmed the slug. Entries marked `verified: false` were added
 * from public knowledge of which ATS the company uses — run
 * `node run.js --only=<id> --dry` once and eyeball the titles before
 * trusting them. run.js also warns when a Greenhouse board's display name
 * doesn't match the company name.
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
    country: "United States", state: "California", segment: "AI / Remote Engineering Talent Platform",
    verified: true, method: "greenhouse", atsSlug: "turing", active: true,
  },
  {
    id: "cameo", name: "Cameo", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/cameo", website: "https://www.cameo.com",
    country: "United States", state: "Illinois", segment: "Consumer / Creator Marketplace",
    verified: true, method: "greenhouse", atsSlug: "cameo", active: true,
  },
  {
    id: "recidiviz", name: "Recidiviz", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/recidiviz", website: "https://www.recidiviz.org",
    country: "United States", state: "California", segment: "Criminal Justice Data / Civic Tech",
    verified: true, method: "greenhouse", atsSlug: "recidiviz", active: true,
  },
  {
    id: "checkr", name: "Checkr", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/checkr", website: "https://checkr.com",
    country: "United States", state: "California", segment: "Background Check Platform",
    verified: true, method: "greenhouse", atsSlug: "checkr", active: true,
    // Posts EA roles frequently across several execs — good repeat source.
  },
  {
    id: "samsara", name: "Samsara", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/samsara", website: "https://www.samsara.com",
    country: "United States", state: "California", segment: "IoT / Fleet Operations Platform",
    verified: true, method: "greenhouse", atsSlug: "samsara", active: true,
  },
  {
    id: "flex", name: "Flex", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/flex", website: "https://getflex.com",
    country: "United States", state: "New York", segment: "Fintech / Bill Pay",
    verified: true, method: "greenhouse", atsSlug: "flex", active: true,
    // Explicitly remote-friendly beyond the US (AU, BR, IL mentioned) — a
    // strong candidate for a high phSignal.
  },
  {
    id: "panoramaed", name: "Panorama Education", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/panoramaed", website: "https://www.panoramaed.com",
    country: "United States", state: "Massachusetts", segment: "Education Data Platform",
    verified: true, method: "greenhouse", atsSlug: "panoramaed", active: true,
  },
  {
    id: "qualio", name: "Qualio", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/qualio", website: "https://www.qualio.com",
    country: "United States", state: "California", segment: "Quality Management SaaS (Life Sciences)",
    verified: true, method: "greenhouse", atsSlug: "qualio", active: true,
    // All-remote team already spanning North America and Europe.
  },
  {
    id: "grafanalabs", name: "Grafana Labs", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/grafanalabs", website: "https://grafana.com",
    country: "United States", state: "New York", segment: "Open-Source Observability",
    verified: true, method: "greenhouse", atsSlug: "grafanalabs", active: true,
  },
  {
    id: "caribou", name: "Caribou", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/caribou", website: "https://www.gocaribou.com",
    country: "United States", state: "Virginia", segment: "Auto Loan Refinancing Fintech",
    verified: true, method: "greenhouse", atsSlug: "caribou", active: true,
  },
  {
    id: "betterup", name: "BetterUp", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/betterup", website: "https://www.betterup.com",
    country: "United States", state: "California", segment: "Coaching / HR Tech",
    verified: true, method: "greenhouse", atsSlug: "betterup", active: true,
  },
  {
    id: "wisetack", name: "Wisetack", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/wisetack", website: "https://www.wisetack.com",
    country: "United States", state: "California", segment: "Point-of-Sale Lending Fintech",
    verified: true, method: "greenhouse", atsSlug: "wisetack", active: true,
    // Fully remote across a dozen+ US states.
  },
  {
    id: "summer", name: "Summer", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/summer", website: "https://www.joinsummer.com",
    country: "United States", state: "New York", segment: "Student Loan Benefits Platform",
    verified: true, method: "greenhouse", atsSlug: "summer", active: true,
  },
  {
    id: "freshprints", name: "Fresh Prints", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/freshprints", website: "https://www.freshprints.com",
    country: "United States", state: "New York", segment: "Custom Apparel",
    verified: true, method: "greenhouse", atsSlug: "freshprints", active: true,
    // Their own postings have explicitly named India & the Philippines as
    // hiring locations for admin/EA support — about as strong a phSignal
    // source as a direct-ATS company gets.
  },
  {
    id: "underdogfantasy", name: "Underdog Sports", hub: "startup",
    careersUrl: "https://boards.greenhouse.io/underdogfantasy", website: "https://underdogfantasy.com",
    country: "United States", state: "New York", segment: "Sports Media / Fantasy Sports",
    verified: true, method: "greenhouse", atsSlug: "underdogfantasy", active: true,
  },

  // ---------------------------------------------------------------------------
  // Verified against live Ashby postings (Aug 2026).
  // ---------------------------------------------------------------------------
  {
    id: "exa", name: "Exa", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/exa", website: "https://exa.ai",
    country: "United States", state: "California", segment: "AI Search Engine",
    verified: true, method: "ashby", atsSlug: "exa", active: true,
    // Has posted the EA role explicitly open to non-US remote candidates.
  },
  {
    id: "percona", name: "Percona", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/percona", website: "https://www.percona.com",
    country: "United States", state: "North Carolina", segment: "Open-Source Database Software",
    verified: true, method: "ashby", atsSlug: "percona", active: true,
  },
  {
    id: "wrapbook", name: "Wrapbook", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/wrapbook", website: "https://www.wrapbook.com",
    country: "United States", state: "New York", segment: "Production Payroll & Finance",
    verified: true, method: "ashby", atsSlug: "wrapbook", active: true,
  },
  {
    id: "zapier", name: "Zapier", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/zapier", website: "https://zapier.com",
    country: "United States", state: "California", segment: "Workflow Automation SaaS",
    verified: true, method: "ashby", atsSlug: "zapier", active: true,
    // Fully distributed company since day one — reliable repeat source.
  },
  {
    id: "vanta", name: "Vanta", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/vanta", website: "https://www.vanta.com",
    country: "United States", state: "California", segment: "Security & Compliance Automation",
    verified: true, method: "ashby", atsSlug: "vanta", active: true,
  },
  {
    id: "doppler", name: "Doppler", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/doppler", website: "https://www.doppler.com",
    country: "United States", state: "California", segment: "Secrets Management / DevOps",
    verified: true, method: "ashby", atsSlug: "doppler", active: true,
  },
  {
    id: "obsidiansystems", name: "Obsidian Systems", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/obsidiansystems", website: "https://obsidian.systems",
    country: "United States", state: "New York", segment: "Blockchain / Distributed Systems",
    verified: true, method: "ashby", atsSlug: "obsidiansystems", active: true,
    // "Fully remote, global" by their own description — strong phSignal.
  },
  {
    id: "rula", name: "Rula", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/rula", website: "https://www.rula.com",
    country: "United States", state: "California", segment: "Mental Health Access Platform",
    verified: true, method: "ashby", atsSlug: "rula", active: true,
  },
  {
    id: "directive", name: "Directive", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/directive", website: "https://directiveconsulting.com",
    country: "United States", state: "California", segment: "B2B/SaaS Marketing Agency",
    verified: true, method: "ashby", atsSlug: "directive", active: true,
  },
  {
    id: "siena", name: "Siena AI", hub: "startup",
    careersUrl: "https://jobs.ashbyhq.com/siena", website: "https://siena.cx",
    country: "United States", state: "New York", segment: "AI Customer Service Agents",
    verified: true, method: "ashby", atsSlug: "siena", active: true,
  },


  // ---------------------------------------------------------------------------
  // Global additions (Aug 2026) — companies headquartered outside the US, or
  // US-founded but famously distributed, on public Greenhouse / Ashby / Lever
  // boards. NOT yet verified against a live posting: confirm each with
  //     node run.js --only=<id> --dry
  // and flip `verified` to true once the titles look right. A wrong slug puts
  // another company's roles on the board, which is why these ship unverified
  // rather than silently trusted.
  // ---------------------------------------------------------------------------
  { id: "deel", name: "Deel", hub: "startup", careersUrl: "https://jobs.ashbyhq.com/deel", website: "https://www.deel.com",
    country: "United States", state: "California", segment: "Global Payroll / EOR", verified: false, method: "ashby", atsSlug: "deel", active: true,
    // Hires in 100+ countries by design; EA / admin roles appear regularly.
  },
  { id: "remotecom", name: "Remote", hub: "startup", careersUrl: "https://boards.greenhouse.io/remotecom", website: "https://remote.com",
    country: "United States", state: "California", segment: "Global Payroll / EOR", verified: false, method: "greenhouse", atsSlug: "remotecom", active: true,
  },
  { id: "gitlab", name: "GitLab", hub: "startup", careersUrl: "https://boards.greenhouse.io/gitlab", website: "https://about.gitlab.com",
    country: "United States", state: "California", segment: "DevOps Platform (all-remote)", verified: false, method: "greenhouse", atsSlug: "gitlab", active: true,
  },
  { id: "automattic", name: "Automattic", hub: "startup", careersUrl: "https://boards.greenhouse.io/automatticcareers", website: "https://automattic.com",
    country: "United States", state: "California", segment: "WordPress.com / Tumblr (all-remote)", verified: false, method: "greenhouse", atsSlug: "automatticcareers", active: true,
  },
  { id: "canva", name: "Canva", hub: "startup", careersUrl: "https://boards.greenhouse.io/canva", website: "https://www.canva.com",
    country: "Australia", state: null, segment: "Design Platform", verified: false, method: "greenhouse", atsSlug: "canva", active: true,
    // Sydney HQ with a large Manila office — EA roles in both.
  },
  { id: "safetyculture", name: "SafetyCulture", hub: "startup", careersUrl: "https://boards.greenhouse.io/safetyculture", website: "https://safetyculture.com",
    country: "Australia", state: null, segment: "Workplace Operations Platform", verified: false, method: "greenhouse", atsSlug: "safetyculture", active: true,
  },
  { id: "cultureamp", name: "Culture Amp", hub: "startup", careersUrl: "https://boards.greenhouse.io/cultureamp", website: "https://www.cultureamp.com",
    country: "Australia", state: null, segment: "Employee Experience Platform", verified: false, method: "greenhouse", atsSlug: "cultureamp", active: true,
  },
  { id: "xero", name: "Xero", hub: "startup", careersUrl: "https://jobs.lever.co/xero", website: "https://www.xero.com",
    country: "New Zealand", state: null, segment: "SMB Accounting SaaS", verified: false, method: "lever", atsSlug: "xero", active: true,
  },
  { id: "wise", name: "Wise", hub: "startup", careersUrl: "https://boards.greenhouse.io/transferwise", website: "https://wise.com",
    country: "United Kingdom", state: null, segment: "Cross-border Payments", verified: false, method: "greenhouse", atsSlug: "transferwise", active: true,
  },
  { id: "monzo", name: "Monzo", hub: "startup", careersUrl: "https://boards.greenhouse.io/monzo", website: "https://monzo.com",
    country: "United Kingdom", state: null, segment: "Digital Bank", verified: false, method: "greenhouse", atsSlug: "monzo", active: true,
  },
  { id: "deliveroo", name: "Deliveroo", hub: "startup", careersUrl: "https://boards.greenhouse.io/deliveroo", website: "https://deliveroo.co.uk",
    country: "United Kingdom", state: null, segment: "Food Delivery", verified: false, method: "greenhouse", atsSlug: "deliveroo", active: true,
  },
  { id: "hotjar", name: "Hotjar", hub: "startup", careersUrl: "https://boards.greenhouse.io/hotjar", website: "https://www.hotjar.com",
    country: "Malta", state: null, segment: "Product Analytics (all-remote)", verified: false, method: "greenhouse", atsSlug: "hotjar", active: true,
  },
  { id: "personio", name: "Personio", hub: "startup", careersUrl: "https://boards.greenhouse.io/personio", website: "https://www.personio.com",
    country: "Germany", state: null, segment: "HR Software", verified: false, method: "greenhouse", atsSlug: "personio", active: true,
  },
  { id: "celonis", name: "Celonis", hub: "startup", careersUrl: "https://boards.greenhouse.io/celonis", website: "https://www.celonis.com",
    country: "Germany", state: null, segment: "Process Mining", verified: false, method: "greenhouse", atsSlug: "celonis", active: true,
  },
  { id: "typeform", name: "Typeform", hub: "startup", careersUrl: "https://boards.greenhouse.io/typeform", website: "https://www.typeform.com",
    country: "Spain", state: null, segment: "Forms / Surveys", verified: false, method: "greenhouse", atsSlug: "typeform", active: true,
  },
  { id: "n26", name: "N26", hub: "startup", careersUrl: "https://boards.greenhouse.io/n26", website: "https://n26.com",
    country: "Germany", state: null, segment: "Digital Bank", verified: false, method: "greenhouse", atsSlug: "n26", active: true,
  },
  { id: "elevenlabs", name: "ElevenLabs", hub: "startup", careersUrl: "https://jobs.ashbyhq.com/elevenlabs", website: "https://elevenlabs.io",
    country: "United Kingdom", state: null, segment: "AI Audio (remote-first)", verified: false, method: "ashby", atsSlug: "elevenlabs", active: true,
  },
  { id: "posthog", name: "PostHog", hub: "startup", careersUrl: "https://jobs.ashbyhq.com/posthog", website: "https://posthog.com",
    country: "United States", state: "California", segment: "Product Analytics (all-remote)", verified: false, method: "ashby", atsSlug: "posthog", active: true,
  },
  { id: "supabase", name: "Supabase", hub: "startup", careersUrl: "https://jobs.ashbyhq.com/supabase", website: "https://supabase.com",
    country: "Singapore", state: null, segment: "Backend-as-a-Service (all-remote)", verified: false, method: "ashby", atsSlug: "supabase", active: true,
  },
  { id: "lovable", name: "Lovable", hub: "startup", careersUrl: "https://jobs.ashbyhq.com/lovable", website: "https://lovable.dev",
    country: "Sweden", state: null, segment: "AI App Builder", verified: false, method: "ashby", atsSlug: "lovable", active: true,
  },
  { id: "mistral", name: "Mistral AI", hub: "startup", careersUrl: "https://jobs.lever.co/mistral", website: "https://mistral.ai",
    country: "France", state: null, segment: "AI Foundation Models", verified: false, method: "lever", atsSlug: "mistral", active: true,
  },
  { id: "shopify", name: "Shopify", hub: "startup", careersUrl: "https://www.shopify.com/careers", website: "https://www.shopify.com",
    country: "Canada", state: null, segment: "E-commerce Platform", verified: false, method: "dom", atsSlug: null, active: true,
    // Custom careers site — leave method null and let detect-ats.js try, or skip.
  },
  { id: "wealthsimple", name: "Wealthsimple", hub: "startup", careersUrl: "https://jobs.lever.co/wealthsimple", website: "https://www.wealthsimple.com",
    country: "Canada", state: null, segment: "Consumer Fintech", verified: false, method: "lever", atsSlug: "wealthsimple", active: true,
  },
  { id: "clio", name: "Clio", hub: "startup", careersUrl: "https://boards.greenhouse.io/clio", website: "https://www.clio.com",
    country: "Canada", state: null, segment: "Legal Practice Management", verified: false, method: "greenhouse", atsSlug: "clio", active: true,
    // Legal-tech company — the most likely source of Legal Assistant / paralegal-adjacent roles.
  },
  { id: "rappi", name: "Rappi", hub: "startup", careersUrl: "https://jobs.lever.co/rappi", website: "https://www.rappi.com",
    country: "Colombia", state: null, segment: "Super-app / Delivery", verified: false, method: "lever", atsSlug: "rappi", active: true,
  },
  { id: "nubank", name: "Nubank", hub: "startup", careersUrl: "https://boards.greenhouse.io/nubank", website: "https://nubank.com.br",
    country: "Brazil", state: null, segment: "Digital Bank", verified: false, method: "greenhouse", atsSlug: "nubank", active: true,
  },
  { id: "kavak", name: "Kavak", hub: "startup", careersUrl: "https://boards.greenhouse.io/kavak", website: "https://www.kavak.com",
    country: "Mexico", state: null, segment: "Used-car Marketplace", verified: false, method: "greenhouse", atsSlug: "kavak", active: true,
  },
  { id: "grab", name: "Grab", hub: "startup", careersUrl: "https://grab.careers", website: "https://www.grab.com",
    country: "Singapore", state: null, segment: "Super-app", verified: false, method: null, atsSlug: null, active: true,
    // Custom careers site — leave for detect-ats.js.
  },
  { id: "carousell", name: "Carousell", hub: "startup", careersUrl: "https://boards.greenhouse.io/carousell", website: "https://www.carousell.com",
    country: "Singapore", state: null, segment: "Classifieds Marketplace", verified: false, method: "greenhouse", atsSlug: "carousell", active: true,
  },
  { id: "razorpay", name: "Razorpay", hub: "startup", careersUrl: "https://jobs.lever.co/razorpay", website: "https://razorpay.com",
    country: "India", state: null, segment: "Payments", verified: false, method: "lever", atsSlug: "razorpay", active: true,
  },
  { id: "kuda", name: "Kuda", hub: "startup", careersUrl: "https://jobs.lever.co/kuda", website: "https://kuda.com",
    country: "Nigeria", state: null, segment: "Digital Bank", verified: false, method: "lever", atsSlug: "kuda", active: true,
  },
  { id: "yassir", name: "Yassir", hub: "startup", careersUrl: "https://jobs.lever.co/Yassir", website: "https://yassir.com",
    country: "Algeria", state: null, segment: "Super-app (MENA)", verified: false, method: "lever", atsSlug: "Yassir", active: true,
  },
  { id: "careem", name: "Careem", hub: "startup", careersUrl: "https://boards.greenhouse.io/careem", website: "https://www.careem.com",
    country: "United Arab Emirates", state: null, segment: "Super-app (MENA)", verified: false, method: "greenhouse", atsSlug: "careem", active: true,
  },

  // ---------------------------------------------------------------------------
  // Add more companies here as you verify them. Copy a block above, change
  // id/name/careersUrl/website/state/segment, and leave method: null until
  // you've confirmed the ATS — or run `node scripts/detect-ats.js` to try.
  // ---------------------------------------------------------------------------
];
