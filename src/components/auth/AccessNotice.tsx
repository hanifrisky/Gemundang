'use client';

import Link from 'next/link';
import { Lock, SearchX } from 'lucide-react';

export default function AccessNotice({ status }: { status: 'unauthenticated' | 'forbidden' | 'not_found' }) {
  const content = {
    unauthenticated: { title: 'Silakan login', text: 'Anda harus login untuk mengedit projek ini.' },
    forbidden: { title: 'Akses ditolak', text: 'Projek ini bukan milik Anda, sehingga tidak dapat diedit.' },
    not_found: { title: 'Projek tidak ditemukan', text: 'Projek dengan slug ini tidak ada.' },
  }[status];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-200">
      <div className="max-w-sm text-center space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-8">
        {status === 'not_found' ? (
          <SearchX className="w-10 h-10 mx-auto text-slate-500" />
        ) : (
          <Lock className="w-10 h-10 mx-auto text-amber-400" />
        )}
        <h1 className="text-lg font-bold text-white">{content.title}</h1>
        <p className="text-sm text-slate-400">{content.text}</p>
        <div className="flex gap-2 justify-center">
          <Link href="/" className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm">Beranda</Link>
          {status === 'unauthenticated' && (
            <Link href="/login" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
