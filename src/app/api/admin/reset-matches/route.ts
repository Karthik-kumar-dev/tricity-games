import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { dbService, supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    // Broadcast reset event to all listening students
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.channel('hackathon-broadcast').send({
          type: 'broadcast',
          event: 'reset_completed',
          payload: { timestamp: Date.now() },
        });
      } catch (e) {
        // Non-critical
      }
    }

    try {
      revalidatePath('/api/admin/participants');
      revalidatePath('/admin');
      revalidatePath('/');
    } catch (e) {
      // Ignore
    }

    return NextResponse.json(
      {
        success: true,
        resetCount: result.count,
        message: `Reset ${result.count} students back to queue! Ready for next round.`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Reset matches API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to reset matches' },
      { status: 500 }
    );
  }
}
