-- ==============================================================================
-- MIGRATION: PASS HOLDERS TABLE & CSV IMPORT
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create pass_holders table
CREATE TABLE IF NOT EXISTS public.pass_holders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id TEXT,
    team_name TEXT,
    role TEXT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    phone_normalized TEXT NOT NULL,
    branch TEXT,
    college TEXT,
    team_size INT DEFAULT 1,
    food_tokens INT DEFAULT 0,
    activity_passes INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_pass_holder_phone UNIQUE (phone_normalized)
);

-- 2. Performance indexes for normalized phone lookups and active pass checks
CREATE INDEX IF NOT EXISTS idx_pass_holders_phone_normalized ON public.pass_holders(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_pass_holders_activity_passes ON public.pass_holders(activity_passes);
CREATE INDEX IF NOT EXISTS idx_pass_holders_active_lookup ON public.pass_holders(phone_normalized, activity_passes);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.pass_holders ENABLE ROW LEVEL SECURITY;

-- 4. Policies: Allow access for application queries
DROP POLICY IF EXISTS "Public can view pass status" ON public.pass_holders;
CREATE POLICY "Public can view pass status"
    ON public.pass_holders FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin and service role full access on pass_holders" ON public.pass_holders;
CREATE POLICY "Admin and service role full access on pass_holders"
    ON public.pass_holders FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. Atomic Replace All Function
-- Deletes all pass_holders and inserts new records in a single transaction.
-- If any error occurs, the entire operation is automatically rolled back.
CREATE OR REPLACE FUNCTION public.replace_all_pass_holders(p_records jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_count INT := 0;
BEGIN
    -- Delete all existing rows
    DELETE FROM public.pass_holders;

    -- Bulk insert records from JSON array
    INSERT INTO public.pass_holders (
        registration_id,
        team_name,
        role,
        name,
        email,
        phone,
        phone_normalized,
        branch,
        college,
        team_size,
        food_tokens,
        activity_passes
    )
    SELECT 
        r->>'registration_id',
        r->>'team_name',
        r->>'role',
        coalesce(r->>'name', ''),
        r->>'email',
        r->>'phone',
        r->>'phone_normalized',
        r->>'branch',
        r->>'college',
        coalesce((r->>'team_size')::int, 1),
        coalesce((r->>'food_tokens')::int, 0),
        coalesce((r->>'activity_passes')::int, 0)
    FROM jsonb_array_elements(p_records) AS r;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'count', inserted_count
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Replace all pass holders failed: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_all_pass_holders(jsonb) TO anon, authenticated, service_role;
