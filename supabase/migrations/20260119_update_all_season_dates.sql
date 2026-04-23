-- Migration: Update "All Season" dates to current year start + 5 years
-- This updates season dates in hotel_rooms, tour_packages, and transfer_packages

DO $$
DECLARE
    all_season_value TEXT;
    start_date TEXT;
    end_date TEXT;
BEGIN
    -- Calculate dates: Jan 01 of current year to Dec 31 of current year + 5
    start_date := TO_CHAR(DATE_TRUNC('year', CURRENT_DATE), 'Mon DD, YYYY');
    end_date := TO_CHAR((DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '5 years' + INTERVAL '1 year' - INTERVAL '1 day'), 'Mon DD, YYYY');
    all_season_value := start_date || ' - ' || end_date;

    RAISE NOTICE 'Setting All Season dates to: %', all_season_value;

    -- Update hotel_rooms seasons (JSONB column containing array)
    UPDATE hotel_rooms
    SET seasons = (
        SELECT JSONB_AGG(
            CASE
                WHEN season->>'dates' = 'All Season' OR season->>'dates' IS NULL OR season->>'dates' = ''
                THEN JSONB_SET(season, '{dates}', TO_JSONB(all_season_value))
                ELSE season
            END
        )
        FROM JSONB_ARRAY_ELEMENTS(seasons) AS season
    )
    WHERE seasons IS NOT NULL
    AND seasons != '[]'::JSONB
    AND EXISTS (
        SELECT 1 FROM JSONB_ARRAY_ELEMENTS(seasons) AS s
        WHERE s->>'dates' = 'All Season' OR s->>'dates' IS NULL OR s->>'dates' = ''
    );

    RAISE NOTICE 'Updated hotel_rooms seasons';

    -- Update tour_packages seasons (JSONB[] - PostgreSQL array of JSONB)
    UPDATE tour_packages
    SET seasons = (
        SELECT ARRAY_AGG(
            CASE
                WHEN season->>'dates' = 'All Season' OR season->>'dates' IS NULL OR season->>'dates' = ''
                THEN JSONB_SET(season, '{dates}', TO_JSONB(all_season_value))
                ELSE season
            END
        )
        FROM UNNEST(seasons) AS season
    )
    WHERE seasons IS NOT NULL
    AND ARRAY_LENGTH(seasons, 1) > 0
    AND EXISTS (
        SELECT 1 FROM UNNEST(seasons) AS s
        WHERE s->>'dates' = 'All Season' OR s->>'dates' IS NULL OR s->>'dates' = ''
    );

    RAISE NOTICE 'Updated tour_packages seasons';

    -- Update transfer_packages seasons (JSONB[] - PostgreSQL array of JSONB)
    UPDATE transfer_packages
    SET seasons = (
        SELECT ARRAY_AGG(
            CASE
                WHEN season->>'dates' = 'All Season' OR season->>'dates' IS NULL OR season->>'dates' = ''
                THEN JSONB_SET(season, '{dates}', TO_JSONB(all_season_value))
                ELSE season
            END
        )
        FROM UNNEST(seasons) AS season
    )
    WHERE seasons IS NOT NULL
    AND ARRAY_LENGTH(seasons, 1) > 0
    AND EXISTS (
        SELECT 1 FROM UNNEST(seasons) AS s
        WHERE s->>'dates' = 'All Season' OR s->>'dates' IS NULL OR s->>'dates' = ''
    );

    RAISE NOTICE 'Updated transfer_packages seasons';

END $$;
