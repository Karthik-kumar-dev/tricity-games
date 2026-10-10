import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/adminAuth';
import { settingsStore } from '@/lib/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/settings — Returns the current app settings.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: true, settings: settingsStore.get() },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error: any) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings — Updates app settings (e.g., toggle pass check).
 * Body: { passCheckEnabled: boolean }
 */
export async function PATCH(request: NextRequest) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updated = settingsStore.update(body);

    return NextResponse.json({
      success: true,
      settings: updated,
      message: updated.passCheckEnabled
        ? 'Pass verification is now ENABLED. Only pass holders can register.'
        : 'Pass verification is now DISABLED. Anyone can register and match.',
    });
  } catch (error: any) {
    console.error('Settings PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
