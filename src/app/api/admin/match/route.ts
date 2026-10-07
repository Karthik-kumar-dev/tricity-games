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

    const result = await dbService.runMatching();

    // Broadcast instant notification to all active students
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.channel('hackathon-broadcast').send({
          type: 'broadcast',
          event: 'matching_completed',
          payload: { timestamp: Date.now() },
        });
      } catch (e) {
        // Non-critical broadcast failure
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
        data: result,
        message: result.message || 'Matching completed successfully!',
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Matching API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Matching algorithm failed' },
      { status: 500 }
    );
  }
}
