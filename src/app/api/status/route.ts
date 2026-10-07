import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = searchParams.get('phone');

    if (!id && !phone) {
      return NextResponse.json(
        { success: false, error: 'Participant id or phone is required' },
        { status: 400 }
      );
    }

    let participant = null;
    if (id) {
      participant = await dbService.getParticipantById(id);
    } else if (phone) {
      participant = await dbService.getParticipantByPhone(phone);
    }

    if (!participant) {
      // Record not found -> Admin might have cleared data!
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Participant record not found. Database may have been reset.',
      });
    }

    return NextResponse.json(
      {
        success: true,
        exists: true,
        participant,
        isLive: dbService.isLive(),
      },
      {
        headers: {
          // Allow edge CDN to cache for 1s, serve stale for 3s while revalidating
          // This dramatically reduces origin hits when 1000+ students poll simultaneously
          'Cache-Control': 'public, s-maxage=1, stale-while-revalidate=3',
          'CDN-Cache-Control': 'public, s-maxage=1, stale-while-revalidate=3',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('Status check API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check status' },
      { status: 500 }
    );
  }
}
