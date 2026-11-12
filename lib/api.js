import { NextResponse } from 'next/server';
import { apiUser } from '@/lib/api-auth';

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const bad = (message, status = 400) => json({ error: message }, status);
export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

/** Wraps a route handler: auth check + consistent error handling. */
export function route(handler, { auth = true } = {}) {
  return async (req, ctx) => {
    try {
      let user = null;
      if (auth) {
        const result = await apiUser();
        if (!result.user) return result.response;
        user = {
          ...result.user,
          _id: result.user.id,
          timezone: 'Asia/Kolkata',
          settings: {
            remindersEnabled: true,
            reminderTime: '09:00',
            remindUpcoming: true,
            upcomingDaysBefore: 1,
          },
          isGuest: false,
        };
      }
      return await handler(req, ctx, user);
    } catch (e) {
      if (e.name === 'CastError') return bad('Not found', 404);
      if (e.name === 'ValidationError') return bad(Object.values(e.errors)[0]?.message || 'Invalid data');
      console.error(e);
      return bad(e.message || 'Server error', 500);
    }
  };
}
