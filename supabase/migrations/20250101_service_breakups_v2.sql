-- Migration: Restructure service_breakups for day-wise pricing with breakdown fields
-- Version 2: Proper pricing structure with original_cost, discount, markup, tax, final_cost

-- Make legacy columns nullable (they were NOT NULL before, but V2 uses new fields)
ALTER TABLE public.service_breakups
ALTER COLUMN line_items DROP NOT NULL,
ALTER COLUMN subtotals DROP NOT NULL,
ALTER COLUMN total_amount DROP NOT NULL;

-- Add new columns to service_breakups
ALTER TABLE public.service_breakups
ADD COLUMN IF NOT EXISTS day_number INTEGER,
ADD COLUMN IF NOT EXISTS original_cost DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_details JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS markup_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_cost DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rate_per_unit DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS quantity_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS season_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS date_range VARCHAR(100);

-- Update the check constraint to include all valid types
ALTER TABLE public.service_breakups
DROP CONSTRAINT IF EXISTS service_breakups_service_type_check;

ALTER TABLE public.service_breakups
ADD CONSTRAINT service_breakups_service_type_check
CHECK (service_type IN ('hotel', 'tour', 'transfer', 'combo', 'meal', 'other'));

-- Add index for faster day-based queries
CREATE INDEX IF NOT EXISTS idx_service_breakups_day
ON public.service_breakups(chat_id, message_id, day_number);

-- Add comment for documentation
COMMENT ON TABLE public.service_breakups IS 'Day-wise pricing breakdowns for travel quotes. Each row = one service for one day with full pricing breakdown.';
COMMENT ON COLUMN public.service_breakups.day_number IS 'Day number in the itinerary (1, 2, 3, etc.)';
COMMENT ON COLUMN public.service_breakups.original_cost IS 'Base rate before any adjustments';
COMMENT ON COLUMN public.service_breakups.discount_amount IS 'Total discounts applied (positive number)';
COMMENT ON COLUMN public.service_breakups.discount_details IS 'Array of discount details: [{name, amount, percentage}]';
COMMENT ON COLUMN public.service_breakups.markup_amount IS 'Markup added to the service';
COMMENT ON COLUMN public.service_breakups.tax_amount IS 'Taxes and mandatory supplements';
COMMENT ON COLUMN public.service_breakups.final_cost IS 'Final cost = original - discount + markup + tax';
