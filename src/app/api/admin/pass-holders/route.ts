import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { processPassCsvUpload, fetchAllPassHolders, addPassHolder, deletePassHolder } from '@/lib/passService';
import { dbService } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET: Fetch pass holders list and counts (Admin only)
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || searchParams.get('q') || '';

    const { passHolders, counts } = await fetchAllPassHolders(search);

    return NextResponse.json(
      {
        success: true,
        passHolders,
        counts,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching pass holders:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch pass holders' },
      { status: 500 }
    );
  }
}

// POST: Add single student (JSON) OR Upload CSV (multipart/form-data)
export async function POST(request: NextRequest) {
  try {
    // 1. Admin-only check
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // A. Handle single student addition (application/json)
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const {
        registration_id,
        team_name,
        role,
        name,
        email,
        phone,
        branch,
        college,
        team_size,
        food_tokens,
        activity_passes,
        autoRegisterToMatch,
      } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return NextResponse.json(
          { success: false, error: 'Student name is required.' },
          { status: 400 }
        );
      }

      if (!phone || typeof phone !== 'string' || !phone.trim()) {
        return NextResponse.json(
          { success: false, error: 'Phone number is required.' },
          { status: 400 }
        );
      }

      const result = await addPassHolder({
        registration_id,
        team_name,
        role,
        name,
        email,
        phone,
        branch,
        college,
        team_size: team_size !== undefined && team_size !== null && team_size !== '' ? Number(team_size) : 1,
        food_tokens: food_tokens !== undefined && food_tokens !== null && food_tokens !== '' ? Number(food_tokens) : 0,
        activity_passes: activity_passes !== undefined && activity_passes !== null && activity_passes !== '' ? Number(activity_passes) : 1,
      });

      // Optionally auto-register into waiting participants pool
      let participantRegistered = false;
      if (autoRegisterToMatch && result.passHolder) {
        try {
          await dbService.registerParticipant(result.passHolder.name, result.passHolder.phone_normalized);
          participantRegistered = true;
        } catch (regErr) {
          console.warn('Auto register to matchmaking queue notice:', regErr);
        }
      }

      return NextResponse.json({
        success: true,
        passHolder: result.passHolder,
        isUpdated: result.isUpdated,
        participantRegistered,
        message: result.isUpdated
          ? `Student record updated for "${result.passHolder.name}" (${result.passHolder.phone_normalized}).`
          : `Student "${result.passHolder.name}" added to pass holders successfully!`,
      });
    }

    // B. Handle CSV file upload (multipart/form-data)
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const modeRaw = (formData.get('mode') as string) || 'merge';
    const mode = modeRaw === 'replace' ? 'replace' : 'merge';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Please select a CSV file to upload.' },
        { status: 400 }
      );
    }

    // 7. Limit upload size to 2 MB
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: `CSV file exceeds the 2 MB size limit (file size: ${(file.size / 1024 / 1024).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    // Accept only text/csv or .csv extension
    const fileName = (file.name || '').toLowerCase();
    const isCsvName = fileName.endsWith('.csv');
    const isCsvMime = file.type === 'text/csv' || 
                      file.type === 'application/vnd.ms-excel' || 
                      file.type === 'text/plain' || 
                      file.type === '';

    if (!isCsvName && !isCsvMime) {
      return NextResponse.json(
        { success: false, error: 'Only CSV files (.csv) are accepted.' },
        { status: 400 }
      );
    }

    // Read file text as UTF-8
    const buffer = await file.arrayBuffer();
    const text = Buffer.from(buffer).toString('utf-8');

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Uploaded CSV file is empty.' },
        { status: 400 }
      );
    }

    // Process and persist CSV data according to requirements
    const summary = await processPassCsvUpload(text, mode);

    return NextResponse.json(
      {
        success: true,
        mode,
        summary,
        message:
          mode === 'replace'
            ? `Successfully replaced all pass holders. Inserted ${summary.inserted} records.`
            : `Successfully processed CSV: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.skipped.length} skipped.`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('CSV upload processing error:', error);
    // If it's a validation error (e.g. missing headers), return 400
    const msg = error?.message || 'Failed to process CSV file';
    const isValidationError = msg.includes('Missing required CSV headers') || msg.includes('empty');
    return NextResponse.json(
      { success: false, error: msg },
      { status: isValidationError ? 400 : 500 }
    );
  }
}

// DELETE: Delete a pass holder (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!id && !phone) {
      return NextResponse.json(
        { success: false, error: 'Student ID or phone is required to delete.' },
        { status: 400 }
      );
    }

    const res = await deletePassHolder({
      id: id || undefined,
      phone: phone || undefined,
    });

    return NextResponse.json({
      success: true,
      deletedCount: res.deletedCount,
      message: 'Student record deleted from pass holders successfully.',
    });
  } catch (error: any) {
    console.error('Delete pass holder error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete pass holder.' },
      { status: 500 }
    );
  }
}
