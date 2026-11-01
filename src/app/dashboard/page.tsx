'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Plus,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  LogIn,
  LogOut,
  UserPlus,
  LayoutTemplate,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  Share2,
  Users
} from 'lucide-react';
import {
  getMyProjects,
  getTemplates,
  createNewProject,
  isSlugAvailable,
  updateTemplateSettings,
  deleteProject,
  type ProjectSummary,
  type TemplateVisibility
} from '@/lib/projectStorage';
import { getCurrentUser, logoutUser, type CurrentUser } from '@/lib/authActions';
import { isValidSlug } from '@/lib/defaultProject';
import { GameThemeType } from '@/types/base';
import { ALL_THEMES, getThemeDefinition } from '@/themes/registry';

const PAGE_SIZE = 6;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Tab State: 'projects' vs 'templates'
  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');

  // Lazy Loaded Projects State
  const [projectsState, setProjectsState] = useState<{
    items: ProjectSummary[];
    page: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
    loaded: boolean;
  }>({
    items: [],
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    loaded: false
  });

  // Lazy Loaded Templates State
  const [templatesState, setTemplatesState] = useState<{
    items: ProjectSummary[];
    page: number;
    total: number;
    hasMore: boolean;
    loading: boolean;
    loaded: boolean;
  }>({
    items: [],
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    loaded: false
  });

  // Create Project Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<GameThemeType>('platformer');
  const [isTemplateEnabled, setIsTemplateEnabled] = useState(true);
  const [publishAsTemplate, setPublishAsTemplate] = useState(false);
  const [newVisibility, setNewVisibility] = useState<TemplateVisibility>('PRIVATE');
  const [fromTemplate, setFromTemplate] = useState<ProjectSummary | null>(null);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'valid' | 'invalid' | 'taken'>('idle');
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Fetch Projects (Lazy)
  const loadProjects = useCallback(async (page: number, append = false) => {
    setProjectsState(prev => ({ ...prev, loading: true }));
    try {
      const res = await getMyProjects({ page, limit: PAGE_SIZE });
      setProjectsState(prev => ({
        items: append ? [...prev.items, ...res.items] : res.items,
        page: res.page,
        total: res.total,
        hasMore: res.hasMore,
        loading: false,
        loaded: true
      }));
    } catch (err) {
      console.error('Gagal memuat projek:', err);
      setProjectsState(prev => ({ ...prev, loading: false, loaded: true }));
    }
  }, []);

  // Fetch Templates (Lazy)
  const loadTemplates = useCallback(async (page: number, append = false) => {
    setTemplatesState(prev => ({ ...prev, loading: true }));
    try {
      const res = await getTemplates({ page, limit: PAGE_SIZE });
      setTemplatesState(prev => ({
        items: append ? [...prev.items, ...res.items] : res.items,
        page: res.page,
        total: res.total,
        hasMore: res.hasMore,
        loading: false,
        loaded: true
      }));
    } catch (err) {
      console.error('Gagal memuat template:', err);
      setTemplatesState(prev => ({ ...prev, loading: false, loaded: true }));
    }
  }, []);

  // Initial Auth Check
  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        setUser(u);
        setAuthLoaded(true);
        if (u) {
          setActiveTab('projects');
          loadProjects(1, false);
        } else {
          setActiveTab('templates');
          loadTemplates(1, false);
        }
      })
      .catch((err) => {
        console.error('Auth check error:', err);
        setAuthLoaded(true);
        setActiveTab('templates');
        loadTemplates(1, false);
      });
  }, [loadProjects, loadTemplates]);

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    router.push('/');
  };

  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    if (!newSlug || slugStatus === 'idle' || slugStatus === 'taken' || slugStatus === 'invalid') {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setNewSlug(generated);
      checkSlug(generated);
    }
  };

  const checkSlug = async (s: string) => {
    if (!s) {
      setSlugStatus('idle');
      return;
    }
    if (!isValidSlug(s)) {
      setSlugStatus('invalid');
      return;
    }
    const available = await isSlugAvailable(s);
    setSlugStatus(available ? 'valid' : 'taken');
  };

  const handleSlugInputChange = (val: string) => {
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewSlug(sanitized);
    checkSlug(sanitized);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus !== 'valid') return;
    setCreateError(null);

    const res = await createNewProject({
      slug: newSlug,
      title: newTitle.trim() || 'Projek Undangan Baru',
      theme_type: selectedTheme,
      isTemplateEnabled,
      isTemplate: publishAsTemplate,
      visibility: newVisibility,
      fromTemplateSlug: fromTemplate?.slug
    });
    if (!res.ok) {
      setCreateError(res.error);
      return;
    }
    router.push(`/editor/${res.slug}`);
  };

  const applyTemplate = (tpl: ProjectSummary) => {
    setFromTemplate(tpl);
    document.getElementById('create-project-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyLink = (path: string, key: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(key);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FBFDFB] text-[#1c2e24] flex flex-col font-sans">
      {/* TOP NAVBAR */}
      <nav className="sticky top-0 z-40 bg-[#FBFDFB]/90 backdrop-blur-md border-b border-[#e5eee8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-[#eef5f0] hover:bg-[#e2ede6] text-[#2d5a43] transition"
              title="Kembali ke Landing Page"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-base">🌸</span>
              <span className="font-serif font-bold text-xl tracking-tight text-[#1c2e24]">
                Gem<span className="text-[#2d5a43]">undang</span>
              </span>
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e8f3ed] text-[#2d5a43] font-semibold">
              Beranda User
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!authLoaded ? (
              <div className="w-24 h-8 bg-[#eef5f0] rounded-full animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#526d5d]">
                  Halo, <b className="text-[#1c2e24]">{user.name}</b>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 rounded-full bg-[#f0f6f2] hover:bg-[#e4ede7] text-[#3c5445] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> <span>Keluar</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#3c5445] hover:bg-[#eef5f0] transition"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 rounded-full bg-[#2d5a43] hover:bg-[#234734] text-white text-xs font-semibold shadow-xs transition"
                >
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10 space-y-8 flex-1">
        {/* NON-USER BANNER */}
        {authLoaded && !user && (
          <div className="bg-white border border-[#d2e5da] p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#1c2e24]">Masuk untuk Membuat & Menyimpan Undangan</h3>
              <p className="text-xs text-[#526d5d] mt-1">
                Simpan progres desain, kelola data RSVP tamu, dan bagikan tautan unik dengan akun Anda.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-full border border-[#c3dbcb] bg-white hover:bg-[#f2f7f4] text-xs font-semibold text-[#2d5a43] transition"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-full bg-[#2d5a43] hover:bg-[#234734] text-white text-xs font-bold shadow-xs transition"
              >
                Daftar Akun
              </Link>
            </div>
          </div>
        )}

        {/* CREATE PROJECT FORM (FOR LOGGED-IN USERS) */}
        {user && (
          <section
            id="create-project-card"
            className="bg-white border border-[#d2e5da] p-6 sm:p-8 rounded-3xl shadow-xs space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#e8f3ed] border border-[#c3dbcb] flex items-center justify-center text-[#2d5a43]">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1c2e24]">Buat Projek Undangan Baru</h2>
                <p className="text-xs text-[#526d5d]">
                  Pilih format undangan dan tentukan judul serta URL kustom Anda
                </p>
              </div>
            </div>

            {fromTemplate && (
              <div className="flex items-center justify-between gap-3 text-xs bg-[#e8f3ed] border border-[#b8d6c3] text-[#2d5a43] rounded-2xl px-4 py-2.5 font-medium">
                <span className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Mulai dari template: <b>{fromTemplate.title}</b> oleh {fromTemplate.ownerName}
                </span>
                <button
                  type="button"
                  onClick={() => setFromTemplate(null)}
                  className="hover:text-rose-600 transition cursor-pointer"
                  title="Batalkan template"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Format / Theme Selector */}
            {!fromTemplate && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#3c5445]">
                  Pilih Format / Gaya Undangan
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {ALL_THEMES.map((th) => {
                    const Icon = th.icon;
                    const isSelected = selectedTheme === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setSelectedTheme(th.id)}
                        className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition cursor-pointer ${
                          isSelected
                            ? 'border-[#2d5a43] bg-[#edf6f1] ring-1 ring-[#2d5a43]'
                            : 'border-[#e0ebe3] bg-white hover:border-[#bcd8c6]'
                        }`}
                      >
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isSelected
                              ? 'bg-[#2d5a43] text-white'
                              : 'bg-[#e8f3ed] text-[#2d5a43]'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-[#1c2e24]">{th.name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                isSelected
                                  ? 'bg-[#2d5a43]/15 text-[#2d5a43] font-semibold'
                                  : 'bg-[#edf3ef] text-[#5a7765]'
                              }`}
                            >
                              {th.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#526d5d] leading-relaxed">
                            {th.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form Input Title & Slug */}
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-[#3c5445] mb-1">
                  Judul Undangan / Acara
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Contoh: Petualangan Romeo & Juliet"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FBFDFB] border border-[#d2e5da] text-sm text-[#1c2e24] focus:outline-none focus:border-[#2d5a43]"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-[#3c5445] mb-1 flex items-center justify-between">
                  <span>Slug Kustom (ID Projek)</span>
                  {slugStatus === 'valid' && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Sudah Dipakai
                    </span>
                  )}
                  {slugStatus === 'invalid' && (
                    <span className="text-[11px] text-amber-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" /> Huruf kecil, angka, tanda hubung (-)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) => handleSlugInputChange(e.target.value)}
                  placeholder="romeo-juliet"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FBFDFB] border border-[#d2e5da] text-sm font-mono text-[#1c2e24] focus:outline-none focus:border-[#2d5a43]"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={slugStatus !== 'valid'}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#2d5a43] hover:bg-[#234734] disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Projek</span>
                </button>
              </div>

              {createError && (
                <div className="md:col-span-12 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {createError}
                </div>
              )}
            </form>
          </section>
        )}

        {/* TAB BAR (PROJEK SAYA VS TEMPLATE) */}
        <div className="border-b border-[#e2ede6] flex items-center gap-6">
          {user && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('projects');
                if (!projectsState.loaded) loadProjects(1, false);
              }}
              className={`pb-3 font-semibold text-sm transition cursor-pointer flex items-center gap-2 border-b-2 ${
                activeTab === 'projects'
                  ? 'border-[#2d5a43] text-[#2d5a43]'
                  : 'border-transparent text-[#627d6d] hover:text-[#1c2e24]'
              }`}
            >
              <span>Projek Saya</span>
              {projectsState.loaded && (
                <span className="px-2 py-0.5 rounded-full bg-[#e8f3ed] text-[#2d5a43] text-[10px] font-bold">
                  {projectsState.total}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('templates');
              if (!templatesState.loaded) loadTemplates(1, false);
            }}
            className={`pb-3 font-semibold text-sm transition cursor-pointer flex items-center gap-2 border-b-2 ${
              activeTab === 'templates'
                ? 'border-[#2d5a43] text-[#2d5a43]'
                : 'border-transparent text-[#627d6d] hover:text-[#1c2e24]'
            }`}
          >
            <span>Galeri Template Siap Pakai</span>
            {templatesState.loaded && (
              <span className="px-2 py-0.5 rounded-full bg-[#e8f3ed] text-[#2d5a43] text-[10px] font-bold">
                {templatesState.total}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: PROJEK SAYA */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            {projectsState.loading && projectsState.items.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-[#e2ede6] rounded-3xl p-5 space-y-4 animate-pulse">
                    <div className="h-5 w-24 bg-[#eef5f0] rounded-full" />
                    <div className="h-6 w-3/4 bg-[#eef5f0] rounded" />
                    <div className="h-10 bg-[#f4f8f5] rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {!projectsState.loading && projectsState.loaded && projectsState.items.length === 0 && (
              <div className="text-center py-12 px-6 border border-dashed border-[#d2e5da] rounded-3xl space-y-3 bg-white">
                <Gamepad2 className="w-12 h-12 mx-auto text-[#88a393]" />
                <h4 className="text-base font-bold text-[#1c2e24]">Belum Ada Projek</h4>
                <p className="text-xs text-[#526d5d] max-w-sm mx-auto">
                  Anda belum memiliki projek undangan. Isi form di atas untuk membuat projek pertama Anda.
                </p>
              </div>
            )}

            {projectsState.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projectsState.items.map((proj) => (
                  <div
                    key={proj.slug}
                    className="bg-white border border-[#dce8e0] hover:border-[#b4d2bf] rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#edf3ef] text-[#2d5a43] font-semibold border border-[#d2e5da]">
                          {getThemeDefinition(proj.theme_type).badge}
                        </span>
                        <span className="text-[11px] font-mono text-[#526d5d]">v{proj.currentVersion}</span>
                      </div>
                      <h4 className="text-base font-bold text-[#1c2e24] line-clamp-1">{proj.title}</h4>
                      <p className="text-xs font-mono text-[#526d5d] mt-0.5 truncate">/view/{proj.slug}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#e2ede6]">
                      <div className="grid grid-cols-3 gap-1.5">
                        <Link
                          href={`/editor/${proj.slug}`}
                          className="py-2 rounded-xl bg-[#2d5a43] hover:bg-[#234734] text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </Link>
                        {proj.is_template_enabled && (
                          <Link
                            href={`/template/${proj.slug}`}
                            className="py-2 rounded-xl bg-[#e8f3ed] hover:bg-[#d8ebdff0] text-[#2d5a43] text-xs font-semibold flex items-center justify-center gap-1 transition"
                          >
                            Form
                          </Link>
                        )}
                        <Link
                          href={`/view/${proj.slug}`}
                          target="_blank"
                          className="py-2 rounded-xl bg-[#f2f7f4] hover:bg-[#e4ede7] text-[#3c5445] text-xs font-semibold flex items-center justify-center gap-1 transition"
                        >
                          <Eye className="w-3.5 h-3.5" /> Play
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyLink(`/view/${proj.slug}`, proj.slug)}
                        className="w-full py-1.5 px-3 rounded-xl bg-[#FBFDFB] hover:bg-[#f2f7f4] text-[#526d5d] hover:text-[#1c2e24] text-[11px] font-medium transition flex items-center justify-center gap-1.5 border border-[#dce8e0] cursor-pointer"
                      >
                        {copiedSlug === proj.slug ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Tautan Tamu Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Link Undangan (/view/{proj.slug})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GALERI TEMPLATE */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            {templatesState.loading && templatesState.items.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-[#e2ede6] rounded-3xl p-5 space-y-4 animate-pulse">
                    <div className="h-5 w-24 bg-[#eef5f0] rounded-full" />
                    <div className="h-6 w-3/4 bg-[#eef5f0] rounded" />
                    <div className="h-10 bg-[#f4f8f5] rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {!templatesState.loading && templatesState.loaded && templatesState.items.length === 0 && (
              <div className="text-center py-12 px-6 border border-dashed border-[#d2e5da] rounded-3xl space-y-3 bg-white">
                <LayoutTemplate className="w-12 h-12 mx-auto text-[#88a393]" />
                <h4 className="text-base font-bold text-[#1c2e24]">Belum Ada Template Public</h4>
                <p className="text-xs text-[#526d5d] max-w-sm mx-auto">
                  Template siap pakai akan muncul di sini untuk langsung digunakan.
                </p>
              </div>
            )}

            {templatesState.items.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templatesState.items.map((tpl) => (
                  <div
                    key={tpl.slug}
                    className="bg-white border border-[#dce8e0] hover:border-[#b4d2bf] rounded-3xl p-5 flex flex-col justify-between shadow-xs hover:shadow-md transition space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#edf3ef] text-[#2d5a43] font-semibold border border-[#d2e5da]">
                          {getThemeDefinition(tpl.theme_type).badge}
                        </span>
                        <span className="text-[11px] text-[#637d6e]">oleh {tpl.isOwner ? 'Anda' : tpl.ownerName}</span>
                      </div>
                      <h4 className="text-base font-bold text-[#1c2e24] line-clamp-1">{tpl.title}</h4>
                      <p className="text-xs text-[#526d5d] mt-1 line-clamp-2 leading-relaxed">
                        {tpl.subtitle || 'Petualangan undangan interaktif untuk para tamu undangan.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#e2ede6]">
                      <Link
                        href={`/view/${tpl.slug}`}
                        target="_blank"
                        className="py-2 rounded-xl bg-[#f2f7f4] hover:bg-[#e4ede7] text-[#2d5a43] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" /> Pratinjau
                      </Link>
                      <button
                        type="button"
                        onClick={() => applyTemplate(tpl)}
                        className="py-2 rounded-xl bg-[#2d5a43] hover:bg-[#234734] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Gunakan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e2ece5] bg-[#FBFDFB] py-6 px-4 sm:px-6 text-center text-xs text-[#759180]">
        GemUndang © 2026 — Platform Undangan Pernikahan Gamifikasi
      </footer>
    </div>
  );
}
