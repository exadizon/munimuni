import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if ((!baseUrl || !cookieSecret) && process.env.NODE_ENV === 'production') {
  throw new Error('NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are required in production.');
}

if (!baseUrl || !cookieSecret) {
  console.warn('Neon Auth is not configured. Pull NEON_AUTH_BASE_URL and set NEON_AUTH_COOKIE_SECRET.');
}

export const auth = createNeonAuth({
  baseUrl: baseUrl ?? 'http://127.0.0.1:3000/api/auth',
  cookies: {
    secret: cookieSecret ?? 'local-development-only-secret-change-me-32',
  },
});
