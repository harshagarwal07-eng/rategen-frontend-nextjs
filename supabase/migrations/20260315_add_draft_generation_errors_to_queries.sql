-- Add draft_generation_errors to whitelabel_queries
-- Stores errors from the auto-generate-supplier-drafts Edge Function
-- e.g. when a supplier has no primary contact set
-- Format: [{ "supplier_id": "uuid", "supplier_name": "...", "reason": "no_primary_contact" | "no_email" | "draft_creation_failed" | "no_gmail_connection" }]

ALTER TABLE whitelabel_queries
ADD COLUMN IF NOT EXISTS draft_generation_errors JSONB;

COMMENT ON COLUMN whitelabel_queries.draft_generation_errors IS
  'Errors from automated supplier email draft generation. '
  'Set by the auto-generate-supplier-drafts Edge Function when a booking is confirmed. '
  'Cleared on next successful run or set to null when all drafts succeed.';
