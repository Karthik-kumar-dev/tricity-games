import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const result = await dbService.clearAllData();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to clear data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully wiped ${result.count} records. All student sessions reset.`,
    });
  } catch (error: any) {
    console.error('Clear data API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear database' },
      { status: 500 }
    );
  }
}
