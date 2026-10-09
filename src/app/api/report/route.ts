import { NextRequest, NextResponse } from 'next/server';
import { submitReport } from '@/lib/reportService';
import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 15 reports per 60 seconds per IP
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimitCheck = checkRateLimit(`report:${ip}`, 15, 60000);
    if (rateLimitCheck.isRateLimited) {
      return NextResponse.json(
        { success: false, error: 'Too many reports submitted. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const reported_phone = body.reported_phone || body.reportedPhone;
    const category = body.category;
    const details = body.details;
    const reporter_name = body.reporter_name || body.reporterName;
    const reporter_phone = body.reporter_phone || body.reporterPhone;

    if (!reported_phone || typeof reported_phone !== 'string' || !reported_phone.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number to report is required.' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || !category.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please choose a category/reason for your report.' },
        { status: 400 }
      );
    }

    const report = await submitReport({
      reported_phone,
      category,
      details,
      reporter_name,
      reporter_phone,
    });

    return NextResponse.json({
      success: true,
      report,
      message: 'Report submitted successfully. The hackathon organizers have been notified and will investigate.',
    });
  } catch (err: any) {
    console.error('Report submission error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to submit report. Please try again.' },
      { status: 400 }
    );
  }
}
