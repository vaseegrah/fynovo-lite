import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import { connectDB } from './db';
import { COOKIE, jwtSecret, signGuestToken } from './session-token';
import User from '@/models/User';

export { COOKIE };

export async function signToken(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(jwtSecret());
}

export function setAuthCookie(token) {
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
export function clearAuthCookie() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getCurrentUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (payload.guest === true) {
      if (!mongoose.isValidObjectId(payload.sub)) return null;
      return {
        _id: new mongoose.Types.ObjectId(payload.sub),
        name: typeof payload.name === 'string' ? payload.name : 'Guest',
        email: '',
        timezone: typeof payload.timezone === 'string' ? payload.timezone : 'Asia/Kolkata',
        settings: {
          remindersEnabled: true,
          reminderTime: '09:00',
          remindUpcoming: true,
          upcomingDaysBefore: 1,
          theme: 'system',
          ...(payload.settings && typeof payload.settings === 'object' ? payload.settings : {}),
        },
        isGuest: true,
      };
    }
    await connectDB();
    return await User.findById(payload.sub);
  } catch (e) {
    if (e?.code?.startsWith?.('ERR_JW')) return null; // bad / expired token
    throw e;
  }
}

export function publicUser(u) {
  return { id: String(u._id), name: u.name, email: u.email, timezone: u.timezone, settings: u.settings, isGuest: !!u.isGuest };
}

export async function refreshGuestCookie(user) {
  const token = await signGuestToken({
    id: user._id,
    name: user.name,
    timezone: user.timezone,
    settings: user.settings,
  });
  setAuthCookie(token);
}
