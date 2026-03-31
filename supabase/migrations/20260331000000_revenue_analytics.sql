-- Aggregate booking revenue by day for a specific property over the last 30 days
-- Use SECURITY INVOKER so the query respects the RLS policies of the caller
CREATE OR REPLACE FUNCTION get_30_day_revenue(p_property_id UUID)
RETURNS TABLE (
    daily_date DATE,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'::interval
        )::date AS daily_date
    )
    SELECT
        ds.daily_date,
        COALESCE(SUM(b.amount), 0)::NUMERIC AS revenue
    FROM
        date_series ds
    LEFT JOIN
        public.bookings b ON DATE(b.created_at) = ds.daily_date
        AND b.property_id = p_property_id
        AND b.status IN ('Confirmed', 'Checked In', 'Checked Out')
    GROUP BY
        ds.daily_date
    ORDER BY
        ds.daily_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
