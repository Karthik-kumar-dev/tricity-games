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

    const result = await dbService.resetMatches();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset matches' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      resetCount: result.count,
      message: `Reset ${result.count} students back to queue! Ready for next round.`,
    });
  } catch (error: any) {
    console.error('Reset matches API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reset matches' },
      { status: 500 }
    );
  }
}
