-- Migration: Add price_source column to service_breakups
-- Tracks whether a service was priced via combo package or individually

-- Add the price_source column
ALTER TABLE public.service_breakups
ADD COLUMN IF NOT EXISTS price_source VARCHAR(20) DEFAULT 'individual';

-- Add check constraint for valid values
ALTER TABLE public.service_breakups
ADD CONSTRAINT service_breakups_price_source_check
CHECK (price_source IN ('combo', 'individual'));

-- Add index for filtering by price_source
CREATE INDEX IF NOT EXISTS idx_service_breakups_price_source
ON public.service_breakups(chat_id, price_source);

-- Add comment for documentation
COMMENT ON COLUMN public.service_breakups.price_source IS 'Pricing source: "combo" if priced via combo package, "individual" if priced separately';
