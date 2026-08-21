# BridgeDesk — setup

What this is: a static job board (`site/index.html`) fed by a scraper
(`run.js` + `config.js`) that reads Virtual Assistant / Executive Assistant /
Personal Assistant / Legal Assistant openings straight off US startups' own
career pages, plus a Cloudflare Worker (`worker.js`) that handles
applications, AI screening, and the admin console at `site/admin.html`.

No database to install, no build step. Deploys on Cloudflare Pages/Workers,
scrapes on a GitHub Actions schedule.

## File map

```
site/index.html        the public job board
site/admin.html         the applicant pipeline (behind an admin key)
site/jobs.json          the job feed — the scraper overwrites this
site/favicon.svg
site/og.svg              share-card source (no og.png yet — see below)
worker.js                click tracking, AI screening, applications, admin API
config.js                the list of companies to scrape
run.js                   the scraper itself
scripts/detect-ats.js    figures out which ATS a new company uses
.github/workflows/scrape.yml   runs run.js on a daily schedule
wrangler.jsonc           Cloudflare config — points at site/, wires up worker.js + D1
package.json
*-d1.sql                 run each of these once in the D1 console to create the tables
```

## 1. Push this to GitHub

Create a new repo, add every file above (`site/` as a folder, everything
else at the root — including the hidden `.github/` folder), commit.

## 2. Connect it to Cloudflare

**Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
Build command: none needed (`package.json`'s `build` script is a no-op).
Cloudflare reads `wrangler.jsonc` and serves `site/` while running
`worker.js` for anything under `/api/*`.

Open the deployed URL. You should see the board with an amber "sample data"
banner — that's `site/jobs.json`'s placeholder rows, correct before the
first real scrape runs.

## 3. Create the D1 database

**Storage & Databases → D1 → Create database** → name it `bridgedesk-db`.
Copy its ID into `wrangler.jsonc`'s `d1_databases[0].database_id`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`, then redeploy (push a commit, or
**Deployments → Retry**).

In the D1 console, run each of these once, in this order (safe to run
twice — see the comment in each file if you're not sure it applied):

1. `click-tracking-d1.sql`
2. `applications-d1.sql`
3. `decline-d1.sql`
4. `agreements-d1.sql`
5. `history-d1.sql`

## 4. Set the Worker's environment variables

**Workers & Pages → your Worker → Settings → Variables**:

| Variable | Required for | Notes |
|---|---|---|
| `STATS_KEY` | admin console sign-in, `/api/stats` | pick any long random string |
| `ANTHROPIC_API_KEY` | AI screening in the apply wizard | without it, the wizard falls back to a local keyword-match review — nothing breaks |
| `RESEND_API_KEY` | emailing employers when a candidate applies, and candidates when declined | without it, applications still save, they just don't get emailed anywhere |
| `FROM_EMAIL` | outgoing email "from" address | defaults to `BridgeDesk <onboarding@resend.dev>` |
| `EMPLOYER_EMAIL` / `ADMIN_EMAIL` | where a "teaser" introduction goes by default | override per-company via `fee_agreements.contact_email` |

Mark all of these **Secret**, not plaintext, except `FROM_EMAIL`.

## 5. Add companies to scrape

`config.js` ships with 25 real, verified US startups (Checkr, Zapier, Vanta,
Exa, and others) already resolved to a Greenhouse or Ashby board. To add
more:

1. Find the company's careers page, click into a live posting, and read the
   URL to identify the ATS (see the comment block at the top of `config.js`
   for the patterns).
2. Copy a company block, fill in `id`, `name`, `careersUrl`, `website`,
   `state`, `segment`, `method`, `atsSlug`.
3. Or leave `method: null` and run **Actions → Scrape jobs → Run workflow**
   with **detect** ticked — `scripts/detect-ats.js` will try to resolve it
   for you and commit the result.

## 6. Run the scraper

**Actions → Scrape jobs → Run workflow** (leave the "only" field blank to
scrape everyone). It writes `site/jobs.json` and commits it — Cloudflare
redeploys automatically. It's also scheduled to run daily at 07:00 UTC on
its own.

## 7. Sign in to the admin console

Visit `/admin.html`, enter the `STATS_KEY` you set above. From there you can
review applications, run the AI match against a candidate's background,
forward strong matches to an employer (only once a row exists for that
company in `fee_agreements`), or decline with a reason.

## Known gap: `og.png`

`site/og.svg` is the share-card source, but there's no rasterized
`site/og.png` yet — `index.html`'s Open Graph tag points at the `.svg`
directly, which most link-preview crawlers (Slack, iMessage, LinkedIn) don't
render. Export `og.svg` to a 1200×630 PNG (e.g. via any browser's "open SVG,
screenshot" or a design tool) and drop it in as `site/og.png`, then switch
the `og:image` meta tag in `index.html` back to `og.png`.
