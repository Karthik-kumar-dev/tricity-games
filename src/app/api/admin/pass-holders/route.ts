import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { processPassCsvUpload, fetchAllPassHolders } from '@/lib/passService';

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

// POST: Upload and process Pass CSV (Admin only)
export async function POST(request: NextRequest) {
  try {
    // 1. Admin-only check
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

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
