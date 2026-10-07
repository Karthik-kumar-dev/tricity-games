import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const participants = await dbService.getAllParticipants();

    // Calculate metrics
    const total = participants.length;
    const waiting = participants.filter((p) => p.status === 'waiting').length;
    const matched = participants.filter((p) => p.status === 'matched').length;
    const unmatched = participants.filter((p) => p.status === 'unmatched').length;
    const pairsCount = Math.floor(matched / 2);

    return NextResponse.json({
      success: true,
      data: {
        participants,
        metrics: {
          total,
          waiting,
          matched,
          unmatched,
          pairsCount,
        },
        isLive: dbService.isLive(),
      },
    });
  } catch (error: any) {
    console.error('Admin participants fetch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
