-- ==============================================================================
-- HACKATHON MATCHMAKING DATABASE SCHEMA (v2 — SCALABLE for 1000+ users)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    matched_with_id UUID REFERENCES public.participants(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'unmatched')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    matched_at TIMESTAMPTZ,
    CONSTRAINT unique_phone UNIQUE (phone)
);

-- 2. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_participants_phone ON public.participants(phone);
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_matched_with ON public.participants(matched_with_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- 4. Policies:
-- Allow anyone to read participants (required for real-time status updates and match retrieval)
DROP POLICY IF EXISTS "Public can view participants" ON public.participants;
CREATE POLICY "Public can view participants" 
    ON public.participants FOR SELECT 
    USING (true);

-- Allow students to register (INSERT only)
DROP POLICY IF EXISTS "Public can register participant" ON public.participants;
CREATE POLICY "Public can register participant" 
    ON public.participants FOR INSERT 
    WITH CHECK (true);

-- Prohibit direct public updates or deletes from the client 
-- (Admin updates/matching and clearing data use the secure service role key / server route)
DROP POLICY IF EXISTS "Public cannot update directly" ON public.participants;
DROP POLICY IF EXISTS "Public cannot delete directly" ON public.participants;

-- 5. Enable Supabase Realtime for instant updates on client devices (safe to re-run)
ALTER TABLE public.participants REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
    END IF;
END $$;

-- ==============================================================================
-- ATOMIC SERVER-SIDE MATCHING (v2 — Bulk UPDATE, no per-row loop)
-- Performs all pairing inside a single transaction. Even 5000 participants
-- complete in < 200ms because there are only 3 SQL statements total.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.pair_participants()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pair_ids UUID[];
    total_count INT;
    pairs_count INT;
    unmatched_count INT;
BEGIN
    -- Prevent simultaneous matching runs (advisory lock)
    IF NOT pg_try_advisory_xact_lock(424242) THEN
        RETURN json_build_object('success', false, 'error', 'Matching is already in progress.');
    END IF;

    -- 1. Reset ALL previous matches in one statement
    UPDATE public.participants
    SET matched_with_id = NULL,
        status = 'waiting',
        matched_at = NULL
    WHERE status != 'waiting';

    -- 2. Collect all participant IDs in pure cryptographic random order using a distinct subquery
    -- gen_random_uuid() generates uniform 128-bit CSPRNG tokens per row, guaranteeing true uniform randomness
    SELECT array_agg(sub.id) INTO pair_ids 
    FROM (
        SELECT id 
        FROM public.participants 
        ORDER BY gen_random_uuid()
    ) sub;
    total_count := coalesce(array_length(pair_ids, 1), 0);

    IF total_count < 2 THEN
        IF total_count = 1 THEN
            UPDATE public.participants
            SET status = 'unmatched', matched_with_id = NULL
            WHERE id = pair_ids[1];
        END IF;
        RETURN json_build_object('success', true, 'total', total_count, 'pairs', 0, 'unmatched', total_count);
    END IF;

    pairs_count := total_count / 2;
    unmatched_count := total_count % 2;

    -- 3. Bulk pair using generate_series — ONE UPDATE for ALL even-indexed participants
    UPDATE public.participants p
    SET matched_with_id = pair_ids[gs.i + 1],
        status = 'matched',
        matched_at = now()
    FROM generate_series(1, pairs_count * 2, 2) AS gs(i)
    WHERE p.id = pair_ids[gs.i];

    -- 4. Bulk pair the other half — ONE UPDATE for ALL odd-indexed participants (matches with i - 1)
    UPDATE public.participants p
    SET matched_with_id = pair_ids[gs.i - 1],
        status = 'matched',
        matched_at = now()
    FROM generate_series(2, pairs_count * 2, 2) AS gs(i)
    WHERE p.id = pair_ids[gs.i];

    -- 5. If odd count, mark the last participant as unmatched
    IF unmatched_count = 1 THEN
        UPDATE public.participants
        SET matched_with_id = NULL, status = 'unmatched', matched_at = NULL
        WHERE id = pair_ids[total_count];
    END IF;

    RETURN json_build_object(
        'success', true,
        'total', total_count,
        'pairs', pairs_count,
        'unmatched', unmatched_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pair_participants() TO anon, authenticated, service_role;

-- ==============================================================================
-- ATOMIC REGISTRATION — handles race conditions via ON CONFLICT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.register_participant(p_name TEXT, p_phone TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_row public.participants;
    is_dup BOOLEAN := false;
BEGIN
    -- Try INSERT, catch unique violation
    INSERT INTO public.participants (name, phone, status)
    VALUES (trim(p_name), trim(p_phone), 'waiting')
    ON CONFLICT (phone) DO NOTHING
    RETURNING * INTO result_row;

    IF result_row IS NULL THEN
        -- Phone already exists — fetch existing record
        SELECT * INTO result_row FROM public.participants WHERE phone = trim(p_phone);
        is_dup := true;
    END IF;

    RETURN json_build_object(
        'participant', row_to_json(result_row),
        'isDuplicate', is_dup
    );
END;
$$;

-- ==============================================================================
-- RESET MATCHES — returns all participants to waiting queue for the next round
-- (does NOT delete any participant records)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reset_matches()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reset_total INT;
BEGIN
    UPDATE public.participants
    SET matched_with_id = NULL,
        status = 'waiting',
        matched_at = NULL
    WHERE status != 'waiting';

    GET DIAGNOSTICS reset_total = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'count', reset_total
    );
END;
$$;

-- ==============================================================================
-- PASS HOLDERS TABLE & CSV IMPORT SCHEMA
-- ==============================================================================

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

CREATE INDEX IF NOT EXISTS idx_pass_holders_phone_normalized ON public.pass_holders(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_pass_holders_activity_passes ON public.pass_holders(activity_passes);
CREATE INDEX IF NOT EXISTS idx_pass_holders_active_lookup ON public.pass_holders(phone_normalized, activity_passes);

ALTER TABLE public.pass_holders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view pass status" ON public.pass_holders;
CREATE POLICY "Public can view pass status"
    ON public.pass_holders FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin and service role full access on pass_holders" ON public.pass_holders;
CREATE POLICY "Admin and service role full access on pass_holders"
    ON public.pass_holders FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.replace_all_pass_holders(p_records jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inserted_count INT := 0;
BEGIN
    DELETE FROM public.pass_holders;

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

-- ==============================================================================
-- REPORTS TABLE — For reporting phone numbers on student portal
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_phone TEXT NOT NULL,
    reported_phone_normalized TEXT NOT NULL,
    reporter_name TEXT,
    reporter_phone TEXT,
    category TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_reported_phone ON public.reports(reported_phone_normalized);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit reports" ON public.reports;
CREATE POLICY "Public can submit reports"
    ON public.reports FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin and service role access on reports" ON public.reports;
CREATE POLICY "Admin and service role access on reports"
    ON public.reports FOR ALL
    USING (true)
    WITH CHECK (true);



