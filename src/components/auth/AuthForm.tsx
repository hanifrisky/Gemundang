'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Loader2, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '@/lib/authActions';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = isRegister
        ? await registerUser({ name, email, password })
        : await loginUser({ email, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Full reload so every page picks up the new session cookie
      window.location.href = '/';
    } catch {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base sm:text-sm text-white focus:outline-none focus:border-amber-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold text-white">
            <Gamepad2 className="w-6 h-6 text-amber-400" />
            Gem<span className="text-amber-400">Undang</span>
          </Link>
          <p className="text-sm text-slate-400">
            {isRegister ? 'Buat akun untuk mulai membangun undangan game.' : 'Masuk untuk mengelola projek undangan Anda.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nama</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            {isRegister && <p className="text-[11px] text-slate-500 mt-1">Minimal 8 karakter.</p>}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? 'Daftar' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          {isRegister ? (
            <>Sudah punya akun? <Link href="/login" className="text-amber-400 hover:underline">Masuk</Link></>
          ) : (
            <>Belum punya akun? <Link href="/register" className="text-amber-400 hover:underline">Daftar</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
