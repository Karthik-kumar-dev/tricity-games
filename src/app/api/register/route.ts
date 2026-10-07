import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';
import { validateName, validatePhone, normalizePhone } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone } = body;

    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      return NextResponse.json(
        { success: false, error: phoneValidation.error },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    // Save to database
    const result = await dbService.registerParticipant(name, normalizedPhone);

    if (result.isDuplicate) {
      // If already registered, return existing record so student can resume
      return NextResponse.json({
        success: false,
        isDuplicate: true,
        participant: result.participant,
        error: 'This phone number is already registered. Fetching your status...',
      }, { status: 409 });
    }

    if (!result.participant) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to register participant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      participant: result.participant,
      isLive: dbService.isLive(),
    });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
