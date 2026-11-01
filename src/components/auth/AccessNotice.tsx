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
    <div className="min-h-screen bg-[#F4F8F5] flex items-center justify-center p-6 text-[#1C2E24]">
      <div className="max-w-sm w-full text-center space-y-4 bg-white border border-[#E2EDE6] rounded-3xl p-8 shadow-xl shadow-[#2D5A43]/5">
        {status === 'not_found' ? (
          <div className="w-16 h-16 rounded-full bg-[#F4F8F5] flex items-center justify-center mx-auto text-[#5A7765]">
            <SearchX className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#E8F3ED] flex items-center justify-center mx-auto text-[#2D5A43]">
            <Lock className="w-8 h-8" />
          </div>
        )}
        <h1 className="text-xl font-serif font-bold text-[#1C2E24]">{content.title}</h1>
        <p className="text-sm text-[#5A7765]">{content.text}</p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/" className="px-5 py-2.5 rounded-full bg-[#F4F8F5] hover:bg-[#E8F3ED] text-sm font-medium text-[#1C2E24] border border-[#D2E5DA] transition">
            Beranda
          </Link>
          {status === 'unauthenticated' && (
            <Link href="/login" className="px-5 py-2.5 rounded-full bg-[#2D5A43] hover:bg-[#234734] text-white font-semibold text-sm shadow-md shadow-[#2D5A43]/20 transition">
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
