import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || 'hackathon2025';

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      token: expectedPassword,
      message: 'Admin authenticated successfully',
    });

    // Set cookie
    response.cookies.set('admin_token', expectedPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete('admin_token');
  return response;
}
