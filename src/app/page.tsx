'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gamepad2,
  Sparkles,
  Plus,
  ArrowRight,
  Eye,
  Edit3,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  LogIn,
  LogOut,
  UserPlus,
  Globe,
  Lock,
  LayoutTemplate,
  Trash2,
  X,
  Loader2,
  FolderKanban
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

const PAGE_SIZE = 6;

export default function HomePage() {
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
        console.error('Gagal memuat sesi user:', err);
        setAuthLoaded(true);
        setActiveTab('templates');
        loadTemplates(1, false);
      });
  }, [loadProjects, loadTemplates]);

  // Lazy load on Tab Switch
  const handleTabChange = (tab: 'projects' | 'templates') => {
    setActiveTab(tab);
    if (tab === 'projects' && !projectsState.loaded && user) {
      loadProjects(1, false);
    } else if (tab === 'templates' && !templatesState.loaded) {
      loadTemplates(1, false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    window.location.href = '/';
  };

  // Handle Slug Auto-generation or custom input check
  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    if (!newSlug || newSlug === slugify(newTitle)) {
      const generated = slugify(val);
      setNewSlug(generated);
      checkSlug(generated);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const checkSlug = async (s: string) => {
    if (!s || s.trim().length < 3) {
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
    if (!user) {
      router.push('/login');
      return;
    }
    setFromTemplate(tpl);
    document.getElementById('create-project')?.scrollIntoView({ behavior: 'smooth' });
  };

  const changeTemplateSettings = async (proj: ProjectSummary, isTemplate: boolean, visibility: TemplateVisibility) => {
    const ok = await updateTemplateSettings(proj.slug, { isTemplate, visibility });
    if (!ok) {
      alert('Gagal memperbarui pengaturan template.');
      return;
    }
    // Refresh current project and templates
    loadProjects(1, false);
    if (templatesState.loaded) loadTemplates(1, false);
  };

  const handleDelete = async (proj: ProjectSummary) => {
    if (!confirm(`Hapus projek "${proj.title}"? Semua RSVP juga akan terhapus.`)) return;
    const ok = await deleteProject(proj.slug);
    if (!ok) {
      alert('Gagal menghapus projek.');
      return;
    }
    loadProjects(1, false);
    if (templatesState.loaded) loadTemplates(1, false);
  };

  const copyLink = (path: string, key: string) => {
    const fullUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(key);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* TOP NAV */}
      <nav className="border-b border-slate-800 bg-slate-950/80 px-3 sm:px-6 py-2.5 sm:py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm">
          <Link href="/" className="flex items-center gap-2 font-extrabold text-white">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <span>Gem<span className="text-amber-400">Undang</span></span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {!authLoaded ? null : user ? (
              <>
                <span className="text-slate-400 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">
                  Halo, <b className="text-slate-200">{user.name}</b>
                </span>
                <button
                  onClick={handleLogout}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Keluar</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition">
                  <LogIn className="w-3.5 h-3.5" /> Masuk
                </Link>
                <Link href="/register" className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition">
                  <UserPlus className="w-3.5 h-3.5" /> Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO HEADER */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
              <Gamepad2 className="w-4 h-4" />
              <span>Platformer Invitation Website Builder</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Gem<span className="text-amber-400">Undang</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-xl">
              Bangun website undangan interaktif bergaya 2D platformer dengan kontrol ground, parallax background, NPC interaktif (video, foto, dialog, RSVP), dan sistem template dinamis.
            </p>
          </div>

          {/* Quick Demo Button */}
          <Link
            href="/view/wedding-adventure?to=Tamu+Spesial"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-xl flex items-center gap-2.5 transition transform hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Coba Mainkan Demo Game</span>
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto w-full p-3 sm:p-6 space-y-8 sm:space-y-10 flex-1">
        {/* NON-USER CALL TO ACTION */}
        {authLoaded && !user && (
          <section className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Mulai buat undangan game Anda</h2>
              <p className="text-xs text-slate-400">Daftar atau masuk untuk membuat projek baru, menyimpan, dan membagikan template.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/login" className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-semibold">Masuk</Link>
              <Link href="/register" className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold">Daftar Gratis</Link>
            </div>
          </section>
        )}

        {/* CREATE NEW PROJECT SECTION (ONLY LOGGED-IN USERS) */}
        {user && (
          <section
            id="create-project"
            className="bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xl space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Buat Projek Undangan Baru</h2>
                <p className="text-xs text-slate-400">
                  Tentukan judul dan slug kustom untuk membagikan editor, template, atau link bermain tamu
                </p>
              </div>
            </div>

            {fromTemplate && (
              <div className="flex items-center justify-between gap-3 text-xs bg-sky-500/10 border border-sky-500/30 text-sky-300 rounded-xl px-3 py-2">
                <span className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Mulai dari template: <b>{fromTemplate.title}</b> oleh {fromTemplate.ownerName}
                </span>
                <button type="button" onClick={() => setFromTemplate(null)} className="hover:text-white cursor-pointer" title="Batalkan template">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Judul Undangan / Acara
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => handleTitleChange(e.target.value)}
                  placeholder="Contoh: Petualangan Pernikahan Romeo & Juliet"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="md:col-span-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Slug Kustom (ID Projek)</span>
                  {slugStatus === 'valid' && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Tersedia
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Sudah Dipakai
                    </span>
                  )}
                  {slugStatus === 'invalid' && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Hanya huruf kecil, angka, tanda &apos;-&apos;
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs text-slate-500 select-none">/</span>
                  <input
                    type="text"
                    required
                    value={newSlug}
                    onChange={e => handleSlugInputChange(e.target.value)}
                    placeholder="romeo-juliet-quest"
                    className="w-full pl-6 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={slugStatus !== 'valid'}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Buka Editor</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Flags */}
              <div className="md:col-span-12 flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTemplateEnabled}
                    onChange={e => setIsTemplateEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>
                    Izinkan project ini dibuka dalam mode <b>Form Template (/template/:slug)</b>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishAsTemplate}
                    onChange={e => setPublishAsTemplate(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                  />
                  <span>Jadikan <b>template</b> yang bisa dipakai ulang</span>
                </label>
                {publishAsTemplate && (
                  <VisibilityToggle value={newVisibility} onChange={setNewVisibility} />
                )}
              </div>

              {createError && (
                <div className="md:col-span-12 text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" /> {createError}
                </div>
              )}
            </form>
          </section>
        )}

        {/* TAB NAVIGATION: PROJEK SAYA VS GALERI TEMPLATE */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              {user && (
                <button
                  onClick={() => handleTabChange('projects')}
                  className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                    activeTab === 'projects'
                      ? 'bg-amber-500 text-slate-950 shadow-lg'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>Projek Saya</span>
                  {projectsState.loaded && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      activeTab === 'projects' ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {projectsState.total}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => handleTabChange('templates')}
                className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'templates'
                    ? 'bg-sky-500 text-slate-950 shadow-lg'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                <span>Galeri Template</span>
                {templatesState.loaded && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    activeTab === 'templates' ? 'bg-slate-950 text-sky-300' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {templatesState.total}
                  </span>
                )}
              </button>
            </div>

            <span className="text-xs text-slate-400">
              {activeTab === 'projects'
                ? 'Kelola semua projek undangan platformer yang Anda buat'
                : 'Pilih template umum atau gunakan sebagai cetak biru projek baru'}
            </span>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: PROJEK SAYA (LAZY LOADED)                          */}
          {/* ========================================================= */}
          {activeTab === 'projects' && user && (
            <div className="space-y-6">
              {/* Initial Loading Skeleton */}
              {projectsState.loading && projectsState.items.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 animate-pulse">
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-24 bg-slate-800 rounded-full" />
                        <div className="h-5 w-16 bg-slate-800 rounded-full" />
                      </div>
                      <div className="h-6 w-3/4 bg-slate-800 rounded" />
                      <div className="h-4 w-full bg-slate-800/60 rounded" />
                      <div className="h-10 bg-slate-800/40 rounded-xl" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty Projects State */}
              {!projectsState.loading && projectsState.loaded && projectsState.items.length === 0 && (
                <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <FolderKanban className="w-12 h-12 mx-auto text-slate-600" />
                  <h3 className="text-base font-bold text-white">Belum Ada Projek</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Buat projek baru melalui formulir di atas atau gunakan template siap pakai dari Galeri Template.
                  </p>
                  <button
                    onClick={() => handleTabChange('templates')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400"
                  >
                    Buka Galeri Template
                  </button>
                </div>
              )}

              {/* Projects Grid */}
              {projectsState.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projectsState.items.map((proj) => (
                    <div
                      key={proj.slug}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between shadow-xl transition space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 truncate">
                            /{proj.slug}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {proj.isTemplate && <VisibilityBadge visibility={proj.visibility} />}
                            <button
                              onClick={() => handleDelete(proj)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 cursor-pointer transition"
                              title="Hapus projek"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white line-clamp-1">{proj.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {proj.subtitle || 'Petualangan platformer interaktif untuk para tamu undangan.'}
                        </p>

                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-4 text-xs text-slate-400">
                          <span><b>{proj.entityCount}</b> Objek</span>
                          <span>•</span>
                          <span><b>{proj.platformCount}</b> Platform</span>
                          <span>•</span>
                          <span><b>{proj.rsvpCount}</b> RSVP</span>
                        </div>

                        {/* Template Visibility Switcher */}
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={proj.isTemplate}
                              onChange={e => changeTemplateSettings(proj, e.target.checked, proj.visibility)}
                              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                            />
                            <span>Jadikan template</span>
                          </label>
                          {proj.isTemplate && (
                            <VisibilityToggle
                              value={proj.visibility}
                              onChange={v => changeTemplateSettings(proj, true, v)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Action Buttons for Project */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="grid grid-cols-3 gap-2">
                          <Link
                            href={`/editor/${proj.slug}`}
                            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                            title="Buka Level Editor"
                          >
                            <Sliders className="w-4 h-4 text-amber-400" />
                            <span>Editor</span>
                          </Link>

                          <Link
                            href={`/template/${proj.slug}`}
                            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                            title="Buka Form Template"
                          >
                            <Edit3 className="w-4 h-4 text-sky-400" />
                            <span>Form</span>
                          </Link>

                          <Link
                            href={`/view/${proj.slug}`}
                            target="_blank"
                            className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition"
                            title="Mainkan Game Undangan"
                          >
                            <Eye className="w-4 h-4 text-emerald-400" />
                            <span>Play</span>
                          </Link>
                        </div>

                        <button
                          onClick={() => copyLink(`/view/${proj.slug}`, proj.slug)}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition flex items-center justify-center gap-1.5 border border-slate-800 cursor-pointer"
                        >
                          {copiedSlug === proj.slug ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Link Tamu Berhasil Disalin!</span>
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

              {/* Lazy Load More Projects Button */}
              {projectsState.hasMore && (
                <div className="flex flex-col items-center justify-center pt-4 space-y-2">
                  <button
                    onClick={() => loadProjects(projectsState.page + 1, true)}
                    disabled={projectsState.loading}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-200 text-xs font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {projectsState.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Memuat Projek Berikutnya...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-amber-400" />
                        <span>Muat Lebih Banyak Projek</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Menampilkan {projectsState.items.length} dari {projectsState.total} projek
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: GALERI TEMPLATE (LAZY LOADED)                      */}
          {/* ========================================================= */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Initial Loading Skeleton */}
              {templatesState.loading && templatesState.items.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 animate-pulse">
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-24 bg-slate-800 rounded-full" />
                        <div className="h-5 w-16 bg-slate-800 rounded-full" />
                      </div>
                      <div className="h-6 w-3/4 bg-slate-800 rounded" />
                      <div className="h-4 w-full bg-slate-800/60 rounded" />
                      <div className="h-10 bg-slate-800/40 rounded-xl" />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty Templates State */}
              {!templatesState.loading && templatesState.loaded && templatesState.items.length === 0 && (
                <div className="text-center py-12 px-6 border border-dashed border-slate-800 rounded-3xl space-y-3">
                  <LayoutTemplate className="w-12 h-12 mx-auto text-slate-600" />
                  <h3 className="text-base font-bold text-white">Belum Ada Template</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Belum ada template public yang tersedia. Buat projek Anda sendiri dan publikasikan sebagai template.
                  </p>
                </div>
              )}

              {/* Templates Grid */}
              {templatesState.items.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templatesState.items.map((tpl) => (
                    <div
                      key={tpl.slug}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between shadow-xl transition space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] text-slate-400">
                            oleh <b className="text-slate-300">{tpl.isOwner ? 'Anda' : tpl.ownerName}</b>
                          </span>
                          <VisibilityBadge visibility={tpl.visibility} />
                        </div>
                        <h3 className="text-base font-bold text-white line-clamp-1">{tpl.title}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {tpl.subtitle || 'Petualangan platformer interaktif untuk para tamu undangan.'}
                        </p>
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-4 text-xs text-slate-400">
                          <span><b>{tpl.entityCount}</b> Objek</span>
                          <span>•</span>
                          <span><b>{tpl.platformCount}</b> Platform</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                        <Link
                          href={`/view/${tpl.slug}`}
                          target="_blank"
                          className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Eye className="w-4 h-4 text-emerald-400" /> Pratinjau
                        </Link>
                        <button
                          onClick={() => applyTemplate(tpl)}
                          className="py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Gunakan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lazy Load More Templates Button */}
              {templatesState.hasMore && (
                <div className="flex flex-col items-center justify-center pt-4 space-y-2">
                  <button
                    onClick={() => loadTemplates(templatesState.page + 1, true)}
                    disabled={templatesState.loading}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 hover:border-sky-400 text-slate-200 text-xs font-bold transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {templatesState.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Memuat Template Berikutnya...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 text-sky-400" />
                        <span>Muat Lebih Banyak Template</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    Menampilkan {templatesState.items.length} dari {templatesState.total} template
                  </span>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-6 px-6 text-center text-xs text-slate-500">
        GemUndang © 2026 — Platformer Invitation Website Builder
      </footer>
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: TemplateVisibility }) {
  return visibility === 'PUBLIC' ? (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
      <Globe className="w-3 h-3" /> Public
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300 border border-slate-600 flex items-center gap-1">
      <Lock className="w-3 h-3" /> Private
    </span>
  );
}

function VisibilityToggle({
  value,
  onChange
}: {
  value: TemplateVisibility;
  onChange: (v: TemplateVisibility) => void;
}) {
  const btn = (v: TemplateVisibility, label: string, Icon: typeof Globe) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={`px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
        value === v ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-700'
      }`}
    >
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
      {btn('PRIVATE', 'Private', Lock)}
      {btn('PUBLIC', 'Public', Globe)}
    </div>
  );
}
