-- Migration: Drop rooms.type check constraint to allow custom room categories
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any check constraints on the "type" column of the "rooms" table
    FOR r IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu 
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'rooms'
          AND ccu.column_name = 'type'
          AND tc.constraint_type = 'CHECK'
    LOOP
        EXECUTE 'ALTER TABLE public.rooms DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;
