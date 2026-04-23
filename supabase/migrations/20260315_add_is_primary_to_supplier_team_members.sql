-- Add is_primary flag to supplier team members
-- A supplier's primary contact goes to the To field when drafting emails
-- Application enforces one primary per supplier (unset others when setting one)

ALTER TABLE rategen_supplier_team_members
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN rategen_supplier_team_members.is_primary IS
  'When true, this contact is the primary recipient (To field) for supplier emails. '
  'All other contacts for the same supplier are CC recipients. '
  'Enforced at application layer: one primary per supplier.';
