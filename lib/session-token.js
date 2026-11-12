import { SignJWT } from 'jose';

export const COOKIE = 'ite_token';

export function jwtSecret() {
  const value = process.env.JWT_SECRET;
  if (!value && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set');
  }
  return new TextEncoder().encode(value || 'dev-only-secret-change-me');
}

export async function signGuestToken({ id, name, timezone, settings }) {
  return new SignJWT({ guest: true, name, timezone, settings })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(id))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecret());
}
