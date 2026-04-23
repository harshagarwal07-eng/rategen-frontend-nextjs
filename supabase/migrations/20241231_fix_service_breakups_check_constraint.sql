-- Migration: Update service_breakups service_type check constraint
-- Description: Allow all valid service types including combo, meal, other

-- Drop the existing check constraint
ALTER TABLE public.service_breakups
DROP CONSTRAINT IF EXISTS service_breakups_service_type_check;

-- Add new check constraint with all valid types
ALTER TABLE public.service_breakups
ADD CONSTRAINT service_breakups_service_type_check
CHECK (service_type IN ('hotel', 'tour', 'transfer', 'combo', 'meal', 'other'));
