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

    const result = await dbService.runMatching();

    return NextResponse.json({
      success: true,
      data: result,
      message: result.message || 'Matching completed successfully!',
    });
  } catch (error: any) {
    console.error('Matching API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Matching algorithm failed' },
      { status: 500 }
    );
  }
}
