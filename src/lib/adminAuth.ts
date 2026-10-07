import { NextRequest } from 'next/server';

const getExpectedPassword = () => (process.env.ADMIN_PASSWORD || 'hackathon2025').trim();

export function verifyAdminSession(request: NextRequest): boolean {
  // Check auth header or cookie
  const authHeader = request.headers.get('x-admin-token')?.trim();
  const cookieToken = request.cookies.get('admin_token')?.value?.trim();

  const expected = getExpectedPassword();

  if (authHeader && authHeader === expected) {
    return true;
  }
  if (cookieToken && cookieToken === expected) {
    return true;
  }

  return false;
}
