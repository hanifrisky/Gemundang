'use server';

import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { auth, signIn, signOut } from '@/auth';
import { prisma } from './prisma';

export type CurrentUser = { id: number; name: string; email: string };

export type AuthResult = { ok: true } | { ok: false; error: string };

// Returns the logged-in user, or null for guests
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!id) return null;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true },
  });
  return user;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');

  if (name.length < 2) return { ok: false, error: 'Nama minimal 2 karakter.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Format email tidak valid.' };
  if (password.length < 8) return { ok: false, error: 'Password minimal 8 karakter.' };

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { ok: false, error: 'Email sudah terdaftar.' };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name: name.slice(0, 100), email, passwordHash } });

  return loginUser({ email, password });
}

export async function loginUser(input: { email: string; password: string }): Promise<AuthResult> {
  try {
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirect: false,
    });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: 'Email atau password salah.' };
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut({ redirect: false });
}
