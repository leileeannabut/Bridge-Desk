-- BridgeDesk — declining an application
-- ---------------------------------------------------------------------------
-- Adds two columns to the existing applications table. Run once.
--
-- D1 has no "add column if not exists", so running this a second time will
-- error with "duplicate column name" — that is harmless and means it is
-- already applied.
--
-- HOW TO RUN — Cloudflare dashboard:
--   Storage & Databases → D1 → bridgedesk-db → Console → paste → Run
-- ---------------------------------------------------------------------------

alter table applications add column declined_at text;
alter table applications add column decline_reason text;
