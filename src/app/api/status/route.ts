import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

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
      return NextResponse.json(
        {
          success: true,
          exists: false,
          message: 'Participant record not found. Database may have been reset.',
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'CDN-Cache-Control': 'no-store',
            'Vercel-CDN-Cache-Control': 'no-store',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      );
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
          // Zero-caching for real-time responsiveness
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
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
