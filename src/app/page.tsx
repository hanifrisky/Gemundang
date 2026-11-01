'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Gamepad2,
  Sparkles,
  ArrowRight,
  Heart,
  Trophy,
  Share2,
  Users,
  Star,
  ChevronDown,
  Music2,
  MessageCircle,
  Play
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#1c2e24] flex flex-col font-sans selection:bg-[#2d5a43]/15 selection:text-[#1c2e24]">
      {/* 1. TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#FBFDFB]/95 backdrop-blur-md border-b border-[#e5eee8] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo GemUndang */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl">🌸</span>
            <span className="font-serif font-bold text-2xl tracking-tight text-[#1c2e24]">
              Gem<span className="text-[#2d5a43]">undang</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#4b6354]">
            <button
              type="button"
              onClick={() => scrollToSection('beranda')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('tentang')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Tentang
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('fitur')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Fitur
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('testimoni')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Testimoni
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* CTA Button menuju Beranda User (Dashboard) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-[#2d5a43] hover:bg-[#234734] text-white text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow transition"
            >
              <span>Buat Undangan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. SECTION 1: HERO SECTION */}
      {/* Background seamless sesuai warna tepi Hero.png: #f4f5f0 */}
      <section
        id="beranda"
        className="relative pt-8 pb-12 md:pt-14 md:pb-20 overflow-hidden bg-[#f4f5f0]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-[#5a7765]">
                Undangan Pernikahan Berbasis Gamifikasi
              </span>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1c2e24] tracking-tight leading-[1.12]">
                Gemundang
              </h1>

              <p className="font-serif italic text-lg sm:text-xl text-[#446050] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Undangan yang lebih dari sekadar mengundang, tapi juga mengajak bermain dan berbagi kebahagiaan.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#2d5a43] hover:bg-[#234734] text-white font-medium text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 group"
                >
                  <span>Buat Undangan Sekarang</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </Link>

                <Link
                  href="/view/wedding-adventure?to=Tamu+Spesial"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-white/80 hover:bg-white text-[#2d5a43] font-medium text-sm transition flex items-center justify-center gap-2 border border-[#d2e5da]/80 shadow-xs"
                >
                  <Play className="w-4 h-4 fill-[#2d5a43]" />
                  <span>Coba Demo Interaktif</span>
                </Link>
              </div>

              {/* 3 Key Value Props */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t border-[#d8ded4] max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#1c2e24]">Kustomisasi</p>
                    <p className="text-[10px] text-[#637d6e]">Mudah & Cepat</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#1c2e24]">Gamifikasi</p>
                    <p className="text-[10px] text-[#637d6e]">Seru & Menghibur</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-[#1c2e24]">Tamu Lebih</p>
                    <p className="text-[10px] text-[#637d6e]">Terlibat Penuh</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Hero Image (Gambar natural tanpa border / tanpa rounded / tanpa shadow card) */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              <div className="relative w-full max-w-lg">
                {/* Level 1 Floating Gamification Badge */}
                <div className="absolute top-4 right-4 sm:right-6 z-20 bg-white/95 backdrop-blur-md border border-[#e2ede6] rounded-2xl p-2.5 sm:p-3 shadow-lg max-w-[190px]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 text-xs">
                      👑
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-[#1c2e24] leading-tight">
                        Lv. 1 Mulai Petualangan
                      </p>
                      <p className="text-[9px] text-[#637d6e]">Undanganmu!</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#e8efe9] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-[#2d5a43] h-full rounded-full" style={{ width: '45%' }} />
                  </div>
                  <p className="text-[9px] text-right text-[#5a7765] mt-1 font-mono">2/10 Poin</p>
                </div>

                {/* Main Hero Image — natural, unstyled, seamless with #f4f5f0 */}
                <Image
                  src="/images/Hero.png"
                  alt="GemUndang Hero Illustration"
                  width={1536}
                  height={1024}
                  priority
                  className="w-full h-auto object-contain block"
                />

                {/* Speech Bubble: "Ayo, ajak tamu bermain! ♡" */}
                <div className="absolute bottom-10 right-4 sm:right-8 z-20 bg-white/95 backdrop-blur-sm border border-[#e2ede6] rounded-2xl px-3.5 py-2 shadow-md flex items-center gap-1.5 text-xs text-[#2d5a43] font-serif italic">
                  <span>Ayo, ajak tamu bermain!</span>
                  <span className="text-rose-500 font-sans not-italic">♡</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: KENAPA GEMUNDANG? (FEATURE DIORAMA) */}
      {/* Background seamless dioptimalkan dengan warna pastel diorama: #faf7f3 */}
      <section
        id="tentang"
        className="py-16 md:py-24 bg-[#faf7f3] border-t border-[#ede7df] relative"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
            {/* Left Column: Diorama image — unstyled, natural aspect ratio, seamless with bg */}
            <div className="lg:col-span-6 relative flex justify-center order-2 lg:order-1 items-center">
              <div className="w-full max-w-md lg:max-w-lg">
                <Image
                  src="/images/diorama.png"
                  alt="Diorama Pernikahan Gamifikasi"
                  width={1089}
                  height={1444}
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>

            {/* Right Column: Narrative & Key Features */}
            <div className="lg:col-span-6 space-y-6 order-1 lg:order-2" id="fitur">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-semibold text-[#5a7765]">
                  Kenapa Gemundang?
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1c2e24] mt-1.5 tracking-tight">
                  Lebih dari Sekadar Undangan
                </h2>
                <p className="text-sm sm:text-base text-[#446050] mt-3 leading-relaxed">
                  Kami menghadirkan pengalaman undangan pernikahan yang interaktif, menyenangkan, dan tak terlupakan bagi setiap tamu yang membukanya.
                </p>
              </div>

              {/* 4 Feature Items */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-[#e6ded5] shadow-2xs hover:border-[#b8d6c3] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c2e24]">Gamifikasi yang Seru</h3>
                    <p className="text-xs text-[#526d5d] mt-0.5 leading-relaxed">
                      Ajak tamu bermain, kumpulkan koin/poin ucapan, dan menangkan hadiah menarik.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-[#e6ded5] shadow-2xs hover:border-[#b8d6c3] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c2e24]">Desain Elegan &amp; Personal</h3>
                    <p className="text-xs text-[#526d5d] mt-0.5 leading-relaxed">
                      Pilih dari berbagai template dan sesuaikan dengan tema pernikahanmu.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-[#e6ded5] shadow-2xs hover:border-[#b8d6c3] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c2e24]">Mudah Dibagikan</h3>
                    <p className="text-xs text-[#526d5d] mt-0.5 leading-relaxed">
                      Kirim undangan lewat link, WhatsApp, atau media sosial dengan sekali klik.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/80 hover:bg-white border border-[#e6ded5] shadow-2xs hover:border-[#b8d6c3] transition">
                  <div className="w-10 h-10 rounded-xl bg-[#e8f3ed] flex items-center justify-center text-[#2d5a43] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1c2e24]">Data Tamu Terkelola</h3>
                    <p className="text-xs text-[#526d5d] mt-0.5 leading-relaxed">
                      Pantau konfirmasi kehadiran dan interaksi tamu secara real-time.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: SOCIAL PROOF & TESTIMONI DENGAN MOCKUP RSVP */}
      {/* Background seamless sesuai tepi RSVP.png: #faf7f3 */}
      <section
        id="testimoni"
        className="py-16 md:py-24 bg-[#faf7f3] border-t border-[#ede7df]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Proof & Stats */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-semibold text-[#5a7765]">
                  Dipercaya oleh Banyak Pasangan
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1c2e24] mt-1.5 tracking-tight">
                  Ribuan Undangan Telah Dibuat
                </h2>
                <p className="text-sm sm:text-base text-[#446050] mt-3 leading-relaxed">
                  Dari berbagai daerah, Gemundang telah membantu banyak pasangan menciptakan undangan pernikahan yang unik, interaktif, dan penuh makna.
                </p>
              </div>

              {/* Stat Counters */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[#2d5a43]">
                    <Users className="w-4 h-4" />
                    <span className="text-xl sm:text-2xl font-bold font-serif">10K+</span>
                  </div>
                  <p className="text-xs text-[#5a7765]">Pasangan Bahagia</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Star className="w-4 h-4 fill-amber-500" />
                    <span className="text-xl sm:text-2xl font-bold font-serif">4.9/5</span>
                  </div>
                  <p className="text-xs text-[#5a7765]">Rating Pengguna</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-500">
                    <Heart className="w-4 h-4 fill-rose-500" />
                    <span className="text-xl sm:text-2xl font-bold font-serif">100K+</span>
                  </div>
                  <p className="text-xs text-[#5a7765]">Tamu Terlibat</p>
                </div>
              </div>

              {/* Couple Testimonial Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-[#e6ded5] space-y-3">
                <p className="text-xs sm:text-sm text-[#354f40] italic leading-relaxed font-serif">
                  &ldquo;Gemundang bikin persiapan pernikahan kami jadi lebih seru! Tamu-tamu juga sangat antusias karena ada gamifikasinya. Desainnya juga cantik banget dan sesuai dengan tema kami.&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-9 h-9 rounded-full bg-[#d0e5d8] border border-[#b4d2bf] flex items-center justify-center text-sm font-bold text-[#2d5a43]">
                    R&amp;D
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1c2e24]">Rara &amp; Dimas</p>
                    <p className="text-[10px] text-[#637d6e]">Pengguna Gemundang</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: RSVP Artwork — unstyled, seamless with #faf7f3 */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              <div className="relative w-full max-w-md sm:max-w-lg">
                {/* Floating Reward Pill */}
                <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-[#e2ede6] rounded-2xl px-3.5 py-2 shadow-md flex items-center gap-2">
                  <span className="text-amber-500 text-sm">⭐</span>
                  <div>
                    <p className="text-xs font-bold text-[#1c2e24]">+150</p>
                    <p className="text-[9px] text-[#637d6e]">Poin Tamu</p>
                  </div>
                </div>

                {/* RSVP Image unstyled */}
                <Image
                  src="/images/RSVP.png"
                  alt="RSVP Undangan Gemundang"
                  width={1289}
                  height={1221}
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 4: CALL TO ACTION DENGAN WEDDING CAKE */}
      {/* Background seamless sesuai tepi cake.png: #faf7f0 */}
      <section className="py-16 md:py-24 bg-[#faf7f0] border-t border-[#eae3d9] relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="text-[11px] uppercase tracking-widest font-semibold text-[#5a7765]">
                Siap Membuat Undangan Pernikahanmu?
              </span>

              <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1c2e24] tracking-tight leading-tight">
                Mulai Sekarang Bersama Gemundang
              </h2>

              <p className="text-sm sm:text-base text-[#446050] max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Buat undangan pernikahan yang unik, interaktif, dan tak terlupakan. Gratis template, mudah digunakan, dan penuh kejutan!
              </p>

              <div>
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-full bg-[#2d5a43] hover:bg-[#234734] text-white font-medium text-sm shadow-md hover:shadow-lg transition inline-flex items-center gap-2 group"
                >
                  <span>Buat Undangan Sekarang</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </Link>
              </div>
            </div>

            {/* Right Cake Artwork — unstyled, seamless with #faf7f0 */}
            <div className="lg:col-span-6 relative flex justify-center items-center">
              <div className="relative w-full max-w-md sm:max-w-lg">
                {/* Floating Gift Badge */}
                <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-[#e2ede6] rounded-2xl p-2.5 shadow-md max-w-[190px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">🎁</span>
                    <div>
                      <p className="text-[10px] font-bold text-[#1c2e24] leading-tight">
                        Hadiah Spesial
                      </p>
                      <p className="text-[9px] text-[#637d6e]">Menanti Tamu!</p>
                    </div>
                  </div>
                  <div className="w-full bg-[#e8efe9] rounded-full h-1 overflow-hidden">
                    <div className="bg-[#2d5a43] h-full rounded-full" style={{ width: '65%' }} />
                  </div>
                </div>

                {/* Cake Image unstyled */}
                <Image
                  src="/images/cake.png"
                  alt="Wedding Cake Celebration"
                  width={1391}
                  height={1131}
                  className="w-full h-auto object-contain block"
                />

                {/* Romantic Card Quote */}
                <div className="absolute bottom-10 right-4 z-20 bg-white/95 backdrop-blur-sm border border-[#e2ede6] rounded-2xl px-3.5 py-2 shadow-sm text-[11px] text-[#2d5a43] font-serif italic text-center">
                  Setiap undangan adalah awal dari petualangan ♡
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 5: FAQ ACCORDION */}
      <section id="faq" className="py-16 md:py-24 bg-[#FBFDFB] border-t border-[#e2ece5]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-widest font-semibold text-[#5a7765]">
              Pertanyaan yang Sering Diajukan
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1c2e24]">
              FAQ Gemundang
            </h2>
            <p className="text-xs sm:text-sm text-[#446050]">
              Segala hal yang perlu Anda ketahui tentang membuat undangan gamifikasi di Gemundang.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Apa itu Gemundang dan bagaimana cara kerjanya?',
                a: 'Gemundang adalah platform pembuat website undangan pernikahan berbasis gamifikasi pertama di Indonesia. Anda bisa memilih format Vertical Scroll modern atau 2D Platformer petualangan, menyesuaikan foto, teks, dan lokasi acara secara visual, lalu membagikannya kepada para tamu undangan lewat WhatsApp atau media sosial.'
              },
              {
                q: 'Apakah tamu perlu mendownload aplikasi untuk membuka undangan?',
                a: 'Tidak perlu sama sekali! Undangan berjalan langsung di browser HP (Chrome, Safari, dsb.) secara responsif, cepat, dan lancar tanpa perlu install aplikasi apapun.'
              },
              {
                q: 'Bagaimana cara konfirmasi kehadiran (RSVP) oleh tamu?',
                a: 'Tamu cukup mengklik tombol RSVP atau berinteraksi dengan karakter di dalam undangan, mengisi nama, jumlah tamu (pax), dan ucapan doa restu. Data tersebut langsung masuk ke dashboard Anda secara real-time.'
              },
              {
                q: 'Apakah saya bisa menggunakan nama tamu personal di tautan?',
                a: 'Tentu saja! Anda bisa menambahkan parameter nama tamu (misal: /view/pernikahan-kami?to=Budi+Sekeluarga) sehingga nama tamu otomatis terpampang manis di sampul undangan.'
              }
            ].map((faq, idx) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-[#dce8e0] bg-white overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-sm text-[#1c2e24] flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#5a7765] transition-transform duration-200 shrink-0 ${
                      openFaq === idx ? 'rotate-180 text-[#2d5a43]' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-[#446050] leading-relaxed border-t border-[#eaf2ec] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-[#e2ece5] bg-[#FBFDFB] py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base">🌸</span>
              <span className="font-serif font-bold text-xl tracking-tight text-[#1c2e24]">
                Gem<span className="text-[#2d5a43]">undang</span>
              </span>
            </div>
            <p className="text-xs text-[#637d6e]">Undangan. Bermain. Berbagi.</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-xs text-[#526d5d]">
            <button
              type="button"
              onClick={() => scrollToSection('beranda')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('tentang')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Tentang
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('fitur')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Fitur
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('testimoni')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              Testimoni
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className="hover:text-[#1c2e24] transition cursor-pointer"
            >
              FAQ
            </button>
          </div>

          {/* Social Icons & Copyright */}
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-3 text-[#526d5d]">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#2d5a43] transition p-1"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#2d5a43] transition p-1"
                aria-label="TikTok"
              >
                <Music2 className="w-4 h-4" />
              </a>
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#2d5a43] transition p-1"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
            <div className="text-xs text-[#759180]">
              © 2026 Gemundang. Semerbak Rindang.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
