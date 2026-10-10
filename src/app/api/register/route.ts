import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabaseAdmin';
import { validateName, normalizePhone } from '@/lib/validation';
import { hasActivePass } from '@/lib/passService';
import { checkRateLimit } from '@/lib/rateLimit';
import { settingsStore } from '@/lib/settingsStore';

export async function POST(request: NextRequest) {
  try {
    // 6. Basic rate limiting on this entry endpoint
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitCheck = checkRateLimit(`register:${ip}`, 20, 60000);
    if (rateLimitCheck.isRateLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, phone } = body;

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    // 1. normalizePhone(phone): remove all non-digits, strip leading 91/0 country prefix, keep last 10 digits.
    // Must be exactly 10 digits, else return 400 "Enter a valid 10-digit phone number".
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid 10-digit phone number' },
        { status: 400 }
      );
    }

    // Check if pass verification is enabled via admin toggle
    const passCheckEnabled = settingsStore.isPassCheckEnabled();

    if (passCheckEnabled) {
      // 2. hasActivePass(phone): look up normalized phone in pass_holders where activity_passes >= 1.
      // 7. Fail closed: if DB errors, deny entry and show "Something went wrong, please try again."
      let activePass = false;
      try {
        activePass = await hasActivePass(normalizedPhone);
      } catch (passCheckError: any) {
        console.error('Pass verification database error (failing closed):', passCheckError);
        return NextResponse.json(
          { success: false, error: 'Something went wrong, please try again.' },
          { status: 500 }
        );
      }

      // 4. If NO active pass (or phone not in table):
      // Do NOT save anything in the users table. Do NOT enter the matching queue.
      // Return 403 with message: "No active activity pass found for this number. Please buy an activity pass to play."
      if (!activePass) {
        return NextResponse.json(
          {
            success: false,
            error: 'No active activity pass found for this number. Please buy an activity pass to play.',
          },
          { status: 403 }
        );
      }
    }
    // If passCheckEnabled is false, skip pass verification entirely — allow everyone to register

    // 3. If active pass:
    // Allow user to continue. Upsert into existing users table (name + normalized phone).
    // If phone already exists, update that row instead of inserting duplicate.
    try {
      const result = await dbService.registerParticipant(name, normalizedPhone);

      if (!result.participant) {
        return NextResponse.json(
          { success: false, error: 'Something went wrong, please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        participant: result.participant,
        isDuplicate: result.isDuplicate,
        isLive: dbService.isLive(),
      });
    } catch (dbError: any) {
      console.error('Database registration error (failing closed):', dbError);
      return NextResponse.json(
        { success: false, error: 'Something went wrong, please try again.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { success: false, error: 'Something went wrong, please try again.' },
      { status: 500 }
    );
  }
}
