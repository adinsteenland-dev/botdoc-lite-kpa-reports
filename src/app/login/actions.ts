'use server';

import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { redirect } from 'next/navigation';

export async function login(_prev: { error: string } | null, formData: FormData): Promise<{ error: string }> {
  const password = formData.get('password');

  if (typeof password !== 'string' || password !== process.env.APP_PASSWORD) {
    return { error: 'Incorrect password.' };
  }

  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error('APP_SESSION_SECRET environment variable is not set.');
  const token = createHmac('sha256', secret).update('authenticated').digest('hex');

  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  redirect('/');
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
  redirect('/login');
}
