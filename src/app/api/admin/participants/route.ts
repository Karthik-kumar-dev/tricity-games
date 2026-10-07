import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';
import { verifyAdminSession } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          'Surrogate-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Admin participants fetch error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch participants' },
      { status: 500 }
    );
  }
}
