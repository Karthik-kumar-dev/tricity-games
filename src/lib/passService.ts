import { normalizePhone } from './validation';
import { supabaseAdmin, isServerSupabaseConfigured } from './supabaseAdmin';
import { mockStore } from './mockStore';
import { PassHolder, CsvUploadSummary, CsvSkippedRow } from './types';

/**
 * Checks whether a phone number has an ACTIVE PASS in pass_holders.
 * Rule: a phone has an ACTIVE PASS only if Activity Passes Added >= 1.
 * If the same phone appears in multiple rows, treat as active if ANY row has activity_passes >= 1.
 */
export async function hasActivePass(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length !== 10) {
    return false;
  }

  // Fallback to in-memory mock store if Supabase is not live
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.hasActivePass(normalized);
  }

  // Parameterized Supabase query on indexed columns:
  // Activity Passes Added >= 1
  const { data, error } = await supabaseAdmin
    .from('pass_holders')
    .select('id, activity_passes')
    .eq('phone_normalized', normalized)
    .gte('activity_passes', 1)
    .limit(1);

  if (error) {
    console.error('Database error checking pass_holders in hasActivePass:', error);
    // Fail closed: throw so caller handles with safe error message
    throw error;
  }

  return Boolean(data && data.length > 0);
}

/**
 * Robust RFC 4180 compliant CSV parser:
 * - Strips UTF-8 BOM
 * - Handles \r\n, \r, and \n line endings
 * - Handles quotes, escaped quotes (""), and commas inside quotes
 */
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[]; rawRowsCount: number } {
  let cleaned = text || '';
  // Remove UTF-8 Byte Order Mark (BOM) if present
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1);
  }

  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const nextChar = cleaned[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in CRLF
      }
      currentRow.push(currentField);
      currentField = '';
      if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0].trim() === '')) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 0 && !(currentRow.length === 1 && currentRow[0].trim() === '')) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [], rawRowsCount: 0 };
  }

  const rawHeaders = lines[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const rowObj: Record<string, string> = {};
    const line = lines[r];
    for (let c = 0; c < rawHeaders.length; c++) {
      rowObj[rawHeaders[c]] = line[c] !== undefined ? line[c].trim() : '';
    }
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows, rawRowsCount: rows.length };
}

// Find header case-insensitively and ignoring punctuation/underscores/spaces
export function findMatchingHeader(headers: string[], target: string): string | undefined {
  const norm = target.toLowerCase().replace(/[\s_-]+/g, '');
  return headers.find((h) => {
    const hNorm = h.trim().toLowerCase().replace(/[\s_-]+/g, '');
    return hNorm === norm || h.trim().toLowerCase() === target.toLowerCase();
  });
}

/**
 * Processes and executes CSV pass holders upload according to requirements:
 * 1. Required headers validation: Registration ID, Name, Phone, Activity Passes Added
 * 2. Row handling: skip empty/invalid phone, duplicate phones (keep highest activity passes), blank passes -> 0
 * 3. Execution modes: "merge" (upsert) vs "replace" (transactional replace all)
 * 4. Summary reporting
 */
export async function processPassCsvUpload(
  csvText: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<CsvUploadSummary> {
  const { headers, rows, rawRowsCount } = parseCSV(csvText);

  if (headers.length === 0) {
    throw new Error('CSV file is empty. Please provide a valid CSV with headers.');
  }

  // Validate required headers
  const requiredFields = ['Registration ID', 'Name', 'Phone', 'Activity Passes Added'];
  const missingHeaders: string[] = [];
  const resolvedHeaderMap: Record<string, string> = {};

  for (const field of requiredFields) {
    const matched = findMatchingHeader(headers, field);
    if (!matched) {
      missingHeaders.push(field);
    } else {
      resolvedHeaderMap[field] = matched;
    }
  }

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required CSV headers: ${missingHeaders.join(', ')}. Please ensure your CSV includes: Registration ID, Name, Phone, Activity Passes Added.`
    );
  }

  // Resolve optional headers
  const regIdKey = resolvedHeaderMap['Registration ID'];
  const nameKey = resolvedHeaderMap['Name'];
  const phoneKey = resolvedHeaderMap['Phone'];
  const passesKey = resolvedHeaderMap['Activity Passes Added'];

  const teamNameKey = findMatchingHeader(headers, 'Team Name');
  const roleKey = findMatchingHeader(headers, 'Role');
  const emailKey = findMatchingHeader(headers, 'Email');
  const branchKey = findMatchingHeader(headers, 'Branch');
  const collegeKey = findMatchingHeader(headers, 'College');
  const teamSizeKey = findMatchingHeader(headers, 'Team Size');
  const foodTokensKey = findMatchingHeader(headers, 'Food Tokens Added') || findMatchingHeader(headers, 'Food Tokens');

  const skipped: CsvSkippedRow[] = [];
  // Map of normalizedPhone -> PassHolder
  const passHolderMap = new Map<string, PassHolder & { _rowNum: number }>();

  // Process rows
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Line 1 is header
    const rawPhone = row[phoneKey] || '';

    // Check empty phone
    if (!rawPhone.trim()) {
      skipped.push({
        row: rowNum,
        reason: 'Empty phone number',
      });
      continue;
    }

    // Check valid 10-digit phone
    const normalized = normalizePhone(rawPhone);
    if (!normalized || normalized.length !== 10) {
      skipped.push({
        row: rowNum,
        phone: rawPhone,
        reason: `Invalid phone number ("${rawPhone}"). Must normalize to exactly 10 digits.`,
      });
      continue;
    }

    // Treat blank Activity Passes Added as 0
    const rawPasses = row[passesKey];
    let activityPasses = 0;
    if (rawPasses !== undefined && rawPasses !== null && rawPasses.trim() !== '') {
      const parsed = parseInt(rawPasses.trim(), 10);
      activityPasses = !isNaN(parsed) && parsed >= 0 ? parsed : 0;
    }

    const rawFood = foodTokensKey ? row[foodTokensKey] : '0';
    const foodTokens = rawFood ? parseInt(rawFood.trim(), 10) || 0 : 0;

    const rawTeamSize = teamSizeKey ? row[teamSizeKey] : '1';
    const teamSize = rawTeamSize ? parseInt(rawTeamSize.trim(), 10) || 1 : 1;

    const currentRecord: PassHolder & { _rowNum: number } = {
      registration_id: row[regIdKey] || '',
      team_name: teamNameKey ? row[teamNameKey] || '' : '',
      role: roleKey ? row[roleKey] || '' : '',
      name: row[nameKey] || '',
      email: emailKey ? row[emailKey] || '' : '',
      phone: rawPhone.trim(),
      phone_normalized: normalized,
      branch: branchKey ? row[branchKey] || '' : '',
      college: collegeKey ? row[collegeKey] || '' : '',
      team_size: teamSize,
      food_tokens: foodTokens,
      activity_passes: activityPasses,
      _rowNum: rowNum,
    };

    // Duplicate phones in the CSV: keep the row with highest Activity Passes Added
    if (passHolderMap.has(normalized)) {
      const existing = passHolderMap.get(normalized)!;
      if (activityPasses > existing.activity_passes) {
        skipped.push({
          row: existing._rowNum,
          phone: existing.phone,
          reason: `Duplicate phone superseded by Row ${rowNum} with higher activity passes (${activityPasses} vs ${existing.activity_passes})`,
        });
        passHolderMap.set(normalized, currentRecord);
      } else {
        skipped.push({
          row: rowNum,
          phone: rawPhone,
          reason: `Duplicate phone superseded by Row ${existing._rowNum} with higher/equal activity passes (${existing.activity_passes} vs ${activityPasses})`,
        });
      }
    } else {
      passHolderMap.set(normalized, currentRecord);
    }
  }

  const validRecords: PassHolder[] = [];
  passHolderMap.forEach(({ _rowNum, ...record }) => {
    validRecords.push(record);
  });

  let insertedCount = 0;
  let updatedCount = 0;

  // Execute database persistence
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    // Mock store execution
    if (mode === 'replace') {
      const res = mockStore.replaceAllPassHolders(validRecords);
      insertedCount = res.inserted;
      updatedCount = 0;
    } else {
      const res = mockStore.upsertPassHolders(validRecords);
      insertedCount = res.inserted;
      updatedCount = res.updated;
    }
  } else {
    // Supabase Live Database
    if (mode === 'replace') {
      // Run atomic replace inside a single Postgres transaction
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'replace_all_pass_holders',
        { p_records: validRecords }
      );

      if (!rpcError && rpcResult?.success) {
        insertedCount = rpcResult.count ?? validRecords.length;
        updatedCount = 0;
      } else {
        // Fallback if RPC function has not been applied yet
        console.warn('RPC replace_all_pass_holders not found or failed, using direct queries:', rpcError?.message);
        
        // 1. Delete all
        const { error: deleteErr } = await supabaseAdmin
          .from('pass_holders')
          .delete()
          .not('id', 'is', null);

        if (deleteErr) {
          throw new Error(`Failed to clear pass_holders: ${deleteErr.message}`);
        }

        // 2. Insert fresh in chunks of 500
        const CHUNK_SIZE = 500;
        for (let idx = 0; idx < validRecords.length; idx += CHUNK_SIZE) {
          const chunk = validRecords.slice(idx, idx + CHUNK_SIZE);
          const { error: insertErr } = await supabaseAdmin.from('pass_holders').insert(chunk);
          if (insertErr) {
            throw new Error(`Failed to insert pass_holders: ${insertErr.message}`);
          }
        }

        insertedCount = validRecords.length;
        updatedCount = 0;
      }
    } else {
      // Mode: "merge" -> upsert by normalized phone
      const phoneList = validRecords.map((r) => r.phone_normalized);

      // Check which phones already exist to count inserted vs updated
      const existingSet = new Set<string>();
      const CHUNK_QUERY = 500;
      for (let idx = 0; idx < phoneList.length; idx += CHUNK_QUERY) {
        const chunk = phoneList.slice(idx, idx + CHUNK_QUERY);
        const { data: existingRows } = await supabaseAdmin
          .from('pass_holders')
          .select('phone_normalized')
          .in('phone_normalized', chunk);

        if (existingRows) {
          existingRows.forEach((r) => existingSet.add(r.phone_normalized));
        }
      }

      validRecords.forEach((r) => {
        if (existingSet.has(r.phone_normalized)) {
          updatedCount++;
        } else {
          insertedCount++;
        }
      });

      // Upsert into pass_holders table
      const CHUNK_SIZE = 500;
      for (let idx = 0; idx < validRecords.length; idx += CHUNK_SIZE) {
        const chunk = validRecords.slice(idx, idx + CHUNK_SIZE);
        const { error: upsertErr } = await supabaseAdmin
          .from('pass_holders')
          .upsert(chunk, { onConflict: 'phone_normalized' });

        if (upsertErr) {
          throw new Error(`Failed to upsert pass_holders: ${upsertErr.message}`);
        }
      }
    }
  }

  // Get latest counts
  const { total, active, noPass } = await getPassHolderCounts();

  return {
    totalRows: rawRowsCount,
    processedRows: validRecords.length,
    inserted: insertedCount,
    updated: updatedCount,
    skipped,
    activePassesCount: active,
    noPassCount: noPass,
    totalHolders: total,
  };
}

/**
 * Returns pass holder counts: total, active (passes >= 1), and no-pass (passes = 0).
 */
export async function getPassHolderCounts(): Promise<{ total: number; active: number; noPass: number }> {
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.getPassHolderCounts();
  }

  try {
    const { count: total, error: totalErr } = await supabaseAdmin
      .from('pass_holders')
      .select('*', { count: 'exact', head: true });

    const { count: active, error: activeErr } = await supabaseAdmin
      .from('pass_holders')
      .select('*', { count: 'exact', head: true })
      .gte('activity_passes', 1);

    if (totalErr || activeErr) {
      console.warn('Error fetching pass_holders counts:', totalErr || activeErr);
      return { total: 0, active: 0, noPass: 0 };
    }

    const totalCount = total || 0;
    const activeCount = active || 0;
    const noPassCount = Math.max(0, totalCount - activeCount);

    return {
      total: totalCount,
      active: activeCount,
      noPass: noPassCount,
    };
  } catch (e) {
    console.error('getPassHolderCounts error:', e);
    return { total: 0, active: 0, noPass: 0 };
  }
}

/**
 * Fetches pass holders with optional search by name or phone.
 */
export async function fetchAllPassHolders(
  searchQuery?: string
): Promise<{ passHolders: PassHolder[]; counts: { total: number; active: number; noPass: number } }> {
  const counts = await getPassHolderCounts();

  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    const list = mockStore.getPassHolders(searchQuery);
    return { passHolders: list, counts };
  }

  try {
    let query = supabaseAdmin
      .from('pass_holders')
      .select('*')
      .order('name', { ascending: true });

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      const norm = normalizePhone(q);
      if (norm) {
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,phone_normalized.ilike.%${norm}%`);
      } else {
        query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching pass holders:', error);
      throw error;
    }

    return {
      passHolders: (data as PassHolder[]) || [],
      counts,
    };
  } catch (e) {
    console.error('fetchAllPassHolders error:', e);
    return { passHolders: [], counts };
  }
}

/**
 * Adds or updates a single pass holder record in pass_holders table.
 */
export async function addPassHolder(data: {
  registration_id?: string;
  team_name?: string;
  role?: string;
  name: string;
  email?: string;
  phone: string;
  branch?: string;
  college?: string;
  team_size?: number;
  food_tokens?: number;
  activity_passes?: number;
}): Promise<{ passHolder: PassHolder; isUpdated: boolean }> {
  const trimmedName = (data.name || '').trim();
  if (!trimmedName) {
    throw new Error('Student name is required.');
  }

  const rawPhone = (data.phone || '').trim();
  const normalized = normalizePhone(rawPhone);
  if (!normalized || normalized.length !== 10) {
    throw new Error('Please enter a valid 10-digit phone number.');
  }

  const teamSize = typeof data.team_size === 'number' && data.team_size > 0 ? data.team_size : 1;
  const foodTokens = typeof data.food_tokens === 'number' && data.food_tokens >= 0 ? data.food_tokens : 0;
  const activityPasses =
    typeof data.activity_passes === 'number' && data.activity_passes >= 0
      ? data.activity_passes
      : 1;
  const regId = data.registration_id?.trim() || `REG-${Math.floor(1000 + Math.random() * 9000)}`;

  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    return mockStore.addPassHolder({
      ...data,
      name: trimmedName,
      registration_id: regId,
      team_size: teamSize,
      food_tokens: foodTokens,
      activity_passes: activityPasses,
    });
  }

  // Check if student exists in Supabase
  const { data: existing, error: checkErr } = await supabaseAdmin
    .from('pass_holders')
    .select('id')
    .eq('phone_normalized', normalized)
    .maybeSingle();

  if (checkErr) {
    console.warn('Error checking existing pass holder:', checkErr.message);
  }

  const isUpdated = Boolean(existing);
  const now = new Date().toISOString();

  const payload: any = {
    registration_id: regId,
    team_name: data.team_name?.trim() || null,
    role: data.role?.trim() || 'Participant',
    name: trimmedName,
    email: data.email?.trim() || null,
    phone: rawPhone,
    phone_normalized: normalized,
    branch: data.branch?.trim() || null,
    college: data.college?.trim() || null,
    team_size: teamSize,
    food_tokens: foodTokens,
    activity_passes: activityPasses,
    updated_at: now,
  };

  const { data: saved, error: upsertErr } = await supabaseAdmin
    .from('pass_holders')
    .upsert(payload, { onConflict: 'phone_normalized' })
    .select('*')
    .single();

  if (upsertErr) {
    console.error('Error saving pass holder in Supabase:', upsertErr);
    throw new Error(`Failed to save pass holder: ${upsertErr.message}`);
  }

  return {
    passHolder: saved as PassHolder,
    isUpdated,
  };
}

/**
 * Deletes a pass holder by ID or phone.
 */
export async function deletePassHolder(identifier: {
  id?: string;
  phone?: string;
}): Promise<{ deletedCount: number }> {
  if (!isServerSupabaseConfigured || !supabaseAdmin) {
    const res = mockStore.deletePassHolder(identifier);
    return { deletedCount: res.deletedCount };
  }

  let query = supabaseAdmin.from('pass_holders').delete();
  if (identifier.id) {
    query = query.eq('id', identifier.id);
  } else if (identifier.phone) {
    const norm = normalizePhone(identifier.phone);
    query = query.eq('phone_normalized', norm);
  } else {
    throw new Error('Pass holder ID or phone is required to delete record.');
  }

  const { error, count } = await query;
  if (error) {
    console.error('Error deleting pass holder:', error);
    throw new Error(`Failed to delete pass holder: ${error.message}`);
  }

  return { deletedCount: count ?? 1 };
}

