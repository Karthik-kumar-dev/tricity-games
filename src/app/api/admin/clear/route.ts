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

    const result = await dbService.clearAllData();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to clear data' },
        { status: 500 }
      );
    }

    // Broadcast database wipe to all connected students to clear local sessions
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.channel('hackathon-broadcast').send({
          type: 'broadcast',
          event: 'database_cleared',
          payload: { timestamp: Date.now() },
        });
      } catch (e) {
        // Non-critical
      }
    }

    // Force purge Next.js server and CDN caches immediately
    try {
      revalidatePath('/api/admin/participants');
      revalidatePath('/admin');
      revalidatePath('/');
    } catch (e) {
      // Ignore in environments where revalidatePath is a noop
    }

    return NextResponse.json(
      {
        success: true,
        deletedCount: result.count,
        message: `Successfully wiped ${result.count} records. All student sessions reset.`,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Clear data API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to clear database' },
      { status: 500 }
    );
  }
}
