'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  VerticalScrollProject,
  PageSection,
  PageLayerElement,
  EntryAnimationType,
  IdleAnimationType,
  ExitAnimationType,
  TriggerType
} from '@/types/verticalScroll';
import VerticalScrollEngine from '../runtime/VerticalScrollEngine';
import {
  getStageWidth,
  getPageStageHeight
} from '../runtime/LayerElementView';
import StagePageCanvas from './StagePageCanvas';
import GradientPicker, { extractPrimaryHexFromBackground } from './GradientPicker';
import AssetLibraryModal from '@/components/asset-library/AssetLibraryModal';
import VersionHistoryModal from '@/components/versioning/VersionHistoryModal';
import SaveVersionModal from '@/components/versioning/SaveVersionModal';
import {
  getProjectVersions,
  createNamedVersion,
  toggleVersionLock,
  renameVersion,
  restoreVersion
} from '@/lib/projectStorage';
import { ProjectVersionItem } from '@/lib/fileStorage';
import { SpriteAsset } from '@/types/base';
import {
  Play,
  Pause,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  Edit3,
  Copy,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Type,
  MousePointer,
  Palette,
  History,
  BookmarkPlus,
  RotateCcw,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  Unlock,
  Undo2,
  Redo2,
  Move,
  Grid3X3,
  Monitor,
  Smartphone
} from 'lucide-react';
import Link from 'next/link';

interface VerticalScrollEditorProps {
  project: VerticalScrollProject;
  currentVersion?: number;
  onSave: (updated: VerticalScrollProject) => Promise<boolean>;
  onReload?: () => Promise<void>;
}

type AssetModalTarget =
  | { kind: 'element_image'; pageId: string; elementId: string }
  | { kind: 'new_element_image'; pageId: string }
  | { kind: 'page_background'; pageId: string }
  | { kind: 'interaction_media'; pageId: string; elementId: string };

function cloneProject(proj: VerticalScrollProject): VerticalScrollProject {
  return JSON.parse(JSON.stringify(proj));
}

let uidSeq = 1;
function createUniqueId(prefix: string): string {
  uidSeq += 1;
  return `${prefix}-${Date.now()}-${uidSeq}`;
}

export default function VerticalScrollEditor({
  project: initialProject,
  currentVersion = 1,
  onSave,
  onReload
}: VerticalScrollEditorProps) {
  const [project, setProject] = useState<VerticalScrollProject>(initialProject);
  const [prevInitialProject, setPrevInitialProject] =
    useState<VerticalScrollProject>(initialProject);
  if (initialProject !== prevInitialProject) {
    setPrevInitialProject(initialProject);
    setProject(initialProject);
  }

  const [isTestPlayMode, setIsTestPlayMode] = useState(false);

  // Undo / Redo stacks
  const [historyPast, setHistoryPast] = useState<VerticalScrollProject[]>([]);
  const [historyFuture, setHistoryFuture] = useState<VerticalScrollProject[]>([]);
  const projectRef = useRef<VerticalScrollProject>(project);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Canvas view options
  const [canvasViewMode, setCanvasViewMode] = useState<'all_scroll' | 'single_page'>('all_scroll');
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const pageDomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Selected Page Section & Element
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialProject.pages[0]?.id || 'page-1'
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  // Inspector Sub-tab
  const [inspectorTab, setInspectorTab] = useState<
    'content' | 'animation' | 'interaction' | 'template'
  >('content');

  // Asset Library Modal target
  const [assetModalTarget, setAssetModalTarget] = useState<AssetModalTarget | null>(null);

  // Versioning state & modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSaveVersionModalOpen, setIsSaveVersionModalOpen] = useState(false);
  const [versionList, setVersionList] = useState<ProjectVersionItem[]>([]);
  const [activeVersionNumber, setActiveVersionNumber] = useState(currentVersion);
  const [prevCurrentVersion, setPrevCurrentVersion] = useState(currentVersion);
  if (currentVersion !== prevCurrentVersion) {
    setPrevCurrentVersion(currentVersion);
    setActiveVersionNumber(currentVersion);
  }

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);

  const recordSnapshot = useCallback(() => {
    const snap = cloneProject(projectRef.current);
    setHistoryPast((prev) => [...prev.slice(-29), snap]);
    setHistoryFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      const currentSnap = cloneProject(projectRef.current);
      setHistoryFuture((f) => [currentSnap, ...f.slice(0, 29)]);
      setProject(previous);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      const currentSnap = cloneProject(projectRef.current);
      setHistoryPast((p) => [...p.slice(-29), currentSnap]);
      setProject(next);
      return prev.slice(1);
    });
  }, []);

  // Load versions
  const loadVersions = useCallback(async () => {
    try {
      const list = await getProjectVersions(project.slug);
      setVersionList(list);
    } catch (err) {
      console.error('Gagal memuat daftar versi:', err);
    }
  }, [project.slug]);

  useEffect(() => {
    let active = true;
    getProjectVersions(project.slug)
      .then((list) => {
        if (active) setVersionList(list);
      })
      .catch((err) => {
        console.error('Gagal memuat daftar versi:', err);
      });
    return () => {
      active = false;
    };
  }, [project.slug]);

  // Sorted pages & current selected page/element
  const sortedPages = project.pages.slice().sort((a, b) => a.order - b.order);
  const currentPage =
    project.pages.find((p) => p.id === selectedPageId) || sortedPages[0];
  const selectedElement =
    currentPage?.elements.find((el) => el.id === selectedElementId) || null;

  const stageWidth = getStageWidth(project);
  const currentStageHeight = currentPage
    ? getPageStageHeight(currentPage, stageWidth)
    : 600;

  // Helper to update an element on any page
  const updateElementOnPage = useCallback(
    (pageId: string, elementId: string, updates: Partial<PageLayerElement>) => {
      setProject((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId
            ? p
            : {
                ...p,
                elements: p.elements.map((el) =>
                  el.id === elementId ? { ...el, ...updates } : el
                )
              }
        )
      }));
    },
    []
  );

  const updateElement = (elementId: string, updates: Partial<PageLayerElement>) => {
    if (!currentPage) return;
    updateElementOnPage(currentPage.id, elementId, updates);
  };

  // Duplicate element
  const duplicateElementOnPage = useCallback(
    (pageId: string, elementId: string) => {
      const targetPage = projectRef.current.pages.find((p) => p.id === pageId);
      if (!targetPage) return;
      const srcEl = targetPage.elements.find((e) => e.id === elementId);
      if (!srcEl) return;

      recordSnapshot();
      const maxZ = targetPage.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
      const copyEl: PageLayerElement = {
        ...JSON.parse(JSON.stringify(srcEl)),
        id: createUniqueId('el'),
        name: `${srcEl.name} (Salinan)`,
        x: Math.min(92, srcEl.x + 4),
        y: Math.min(92, srcEl.y + 4),
        zIndex: maxZ + 1,
        locked: false
      };

      setProject((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId ? p : { ...p, elements: [...p.elements, copyEl] }
        )
      }));
      setSelectedPageId(pageId);
      setSelectedElementId(copyEl.id);
    },
    [recordSnapshot]
  );

  // Remove element
  const removeElementOnPage = useCallback(
    (pageId: string, elementId: string) => {
      recordSnapshot();
      setProject((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== pageId
            ? p
            : { ...p, elements: p.elements.filter((el) => el.id !== elementId) }
        )
      }));
      setSelectedElementId((prevId) => (prevId === elementId ? null : prevId));
    },
    [recordSnapshot]
  );

  // Keyboard shortcuts (Undo, Redo, Arrow Nudge, Delete, Duplicate, Escape)
  useEffect(() => {
    if (isTestPlayMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isEditingField =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT' ||
          active.isContentEditable);

      if (isEditingField) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedElementId || !currentPage) return;
      const el = currentPage.elements.find((item) => item.id === selectedElementId);
      if (!el) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateElementOnPage(currentPage.id, el.id);
        return;
      }

      if (e.key === 'Escape') {
        setSelectedElementId(null);
        return;
      }

      if (el.locked) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeElementOnPage(currentPage.id, el.id);
        return;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 2.5 : 0.5;
        let nx = el.x;
        let ny = el.y;
        if (e.key === 'ArrowLeft') nx -= step;
        if (e.key === 'ArrowRight') nx += step;
        if (e.key === 'ArrowUp') ny -= step;
        if (e.key === 'ArrowDown') ny += step;
        updateElementOnPage(currentPage.id, el.id, {
          x: Math.round(nx * 10) / 10,
          y: Math.round(ny * 10) / 10
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTestPlayMode,
    selectedElementId,
    currentPage,
    handleUndo,
    handleRedo,
    duplicateElementOnPage,
    removeElementOnPage,
    updateElementOnPage
  ]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(project);
    setIsSaving(false);
    if (success) {
      setSaveNotice(true);
      setTimeout(() => setSaveNotice(false), 2500);
    }
  };

  // Handle create named version
  const handleCreateNamedVersion = async (name: string, isLocked: boolean) => {
    await onSave(project);
    const res = await createNamedVersion(project.slug, name, isLocked);
    if (!res.ok) {
      alert(res.error || 'Gagal menyimpan versi.');
      return false;
    }
    if (res.versionItem) {
      setActiveVersionNumber(res.versionItem.versionNumber);
    }
    await loadVersions();
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2500);
    return true;
  };

  // Handle restore version
  const handleRestoreVersion = async (versionId: number) => {
    const res = await restoreVersion(project.slug, versionId);
    if (!res.ok || !res.restoredProject) {
      alert(res.error || 'Gagal memulihkan versi.');
      return false;
    }
    setProject(res.restoredProject as VerticalScrollProject);
    if (onReload) {
      await onReload();
    }
    await loadVersions();
    return true;
  };

  // Page Operations
  const addPage = () => {
    recordSnapshot();
    const newPageOrder = project.pages.length + 1;
    const newPage: PageSection = {
      id: createUniqueId('page'),
      title: `Halaman ${newPageOrder}`,
      order: newPageOrder,
      minHeight: '100vh',
      background: {
        type: 'gradient',
        value: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
      },
      elements: []
    };
    setProject((prev) => ({
      ...prev,
      pages: [...prev.pages, newPage]
    }));
    setSelectedPageId(newPage.id);
    setSelectedElementId(null);
    setTimeout(() => {
      pageDomRefs.current[newPage.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 80);
  };

  const removePage = (pageId: string) => {
    if (project.pages.length <= 1) return;
    recordSnapshot();
    setProject((prev) => {
      const filtered = prev.pages.filter((p) => p.id !== pageId);
      const reordered = filtered.map((p, idx) => ({ ...p, order: idx + 1 }));
      if (selectedPageId === pageId && reordered[0]) {
        setSelectedPageId(reordered[0].id);
        setSelectedElementId(null);
      }
      return { ...prev, pages: reordered };
    });
  };

  const movePage = (pageId: string, direction: 'up' | 'down') => {
    const pagesOrdered = project.pages.slice().sort((a, b) => a.order - b.order);
    const idx = pagesOrdered.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === pagesOrdered.length - 1) return;

    recordSnapshot();
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const temp = pagesOrdered[idx];
    pagesOrdered[idx] = pagesOrdered[targetIdx];
    pagesOrdered[targetIdx] = temp;

    const reordered = pagesOrdered.map((p, i) => ({ ...p, order: i + 1 }));
    setProject((prev) => ({ ...prev, pages: reordered }));
  };

  const duplicatePage = (pageId: string) => {
    const srcPage = project.pages.find((p) => p.id === pageId);
    if (!srcPage) return;
    recordSnapshot();

    const clonedElements: PageLayerElement[] = JSON.parse(
      JSON.stringify(srcPage.elements)
    ).map((el: PageLayerElement) => ({
      ...el,
      id: createUniqueId('el')
    }));

    const duplicated: PageSection = {
      ...JSON.parse(JSON.stringify(srcPage)),
      id: createUniqueId('page'),
      title: `${srcPage.title} (Salinan)`,
      order: project.pages.length + 1,
      elements: clonedElements
    };

    setProject((prev) => ({
      ...prev,
      pages: [...prev.pages, duplicated]
    }));
    setSelectedPageId(duplicated.id);
    setSelectedElementId(null);
  };

  const updatePage = (pageId: string, updates: Partial<PageSection>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, ...updates } : p))
    }));
  };

  // Add Element to a Specific Page
  const addElementToPage = (
    pageId: string,
    type: 'image' | 'text' | 'button',
    customSprite?: SpriteAsset
  ) => {
    const targetPage = project.pages.find((p) => p.id === pageId);
    if (!targetPage) return;

    recordSnapshot();
    const maxZ = targetPage.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    // Slight stagger if multiple elements are centered at 50,50 so user sees each new one clearly
    const centerCount = targetPage.elements.filter(
      (e) => Math.abs(e.x - 50) < 8 && Math.abs(e.y - 50) < 8
    ).length;
    const stagger = (centerCount % 5) * 3;

    const isSpriteFromLibrary = Boolean(customSprite);
    const defaultObjectFit =
      type === 'image'
        ? customSprite &&
          customSprite.category &&
          customSprite.category !== 'background'
          ? 'contain'
          : isSpriteFromLibrary
          ? 'contain'
          : 'cover'
        : undefined;

    const newEl: PageLayerElement = {
      id: createUniqueId('el'),
      name:
        customSprite?.name ||
        (type === 'image'
          ? 'Gambar Baru'
          : type === 'text'
          ? 'Teks Baru'
          : 'Tombol Baru'),
      type,
      x: 50 + stagger,
      y: 50 + stagger,
      width: type === 'image' ? 200 : type === 'button' ? 210 : 320,
      height: type === 'image' ? 200 : type === 'button' ? 48 : 54,
      rotation: 0,
      scale: 1,
      flipX: false,
      flipY: false,
      zIndex: maxZ + 1,
      content:
        type === 'text'
          ? 'Tulis teks Anda di sini...'
          : type === 'button'
          ? 'Klik Saya'
          : undefined,
      mediaUrl:
        type === 'image'
          ? customSprite?.frames?.[0] ||
            'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80'
          : undefined,
      spriteAsset: customSprite,
      styleOptions: {
        fontSize: type === 'text' ? 18 : 14,
        fontWeight: type === 'button' ? 'bold' : 'medium',
        color: type === 'button' ? '#ffffff' : '#0f172a',
        backgroundColor: type === 'button' ? '#d97706' : undefined,
        textAlign: 'center',
        borderRadius:
          type === 'image' ? (isSpriteFromLibrary ? 0 : 16) : type === 'button' ? 12 : 0,
        shadow:
          type === 'image' ? (isSpriteFromLibrary ? 'none' : 'md') : type === 'button' ? 'lg' : 'none',
        opacity: 1,
        objectFit: defaultObjectFit
      },
      animation: {
        entry: {
          type: 'fade-in',
          duration: 0.8,
          delay: 0.1,
          easing: 'ease-out',
          trigger: 'scroll_reveal'
        },
        idle: {
          type: 'none',
          duration: 3
        }
      },
      hasInteraction: false,
      editable_appearance: type === 'image',
      appearanceLabel: type === 'image' ? 'Foto / Gambar' : undefined,
      editable_content: type !== 'image',
      contentLabel: type !== 'image' ? 'Isi Teks / Konten' : undefined
    };

    updatePage(pageId, {
      elements: [...targetPage.elements, newEl]
    });
    setSelectedPageId(pageId);
    setSelectedElementId(newEl.id);
    setInspectorTab('content');
  };

  // Z-Index Manager
  const bringElementForward = (elementId: string) => {
    if (!currentPage) return;
    const el = currentPage.elements.find((e) => e.id === elementId);
    if (!el) return;
    recordSnapshot();
    updateElement(elementId, { zIndex: el.zIndex + 1 });
  };

  const sendElementBackward = (elementId: string) => {
    if (!currentPage) return;
    const el = currentPage.elements.find((e) => e.id === elementId);
    if (!el || el.zIndex <= 1) return;
    recordSnapshot();
    updateElement(elementId, { zIndex: el.zIndex - 1 });
  };

  const bringToFront = (elementId: string) => {
    if (!currentPage) return;
    recordSnapshot();
    const maxZ = currentPage.elements.reduce((max, e) => Math.max(max, e.zIndex), 0);
    updateElement(elementId, { zIndex: maxZ + 1 });
  };

  const sendToBack = (elementId: string) => {
    if (!currentPage) return;
    recordSnapshot();
    const minZ = currentPage.elements.reduce((min, e) => Math.min(min, e.zIndex), 999);
    updateElement(elementId, { zIndex: Math.max(1, minZ - 1) });
  };

  const handleSelectPageFromSidebar = (pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedElementId(null);
    if (canvasViewMode === 'all_scroll') {
      pageDomRefs.current[pageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  const pagesToRender =
    canvasViewMode === 'single_page' && currentPage ? [currentPage] : sortedPages;

  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col select-none overflow-hidden">
      {/* TOP HEADER & ACTION BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base truncate max-w-[180px] md:max-w-md">
                {project.title}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shrink-0">
                Vertical Scroll
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Freeform Canvas Editor — Geser posisi, putar rotasi & atur skala sesuka hati
            </p>
          </div>
        </div>

        {/* Action Controls & Mode Switchers */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Undo / Redo */}
          {!isTestPlayMode && (
            <div className="hidden md:flex items-center bg-slate-800/90 border border-slate-700 rounded-xl p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyPast.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyFuture.length === 0}
                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 disabled:opacity-30 transition cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Test Scroll Mode Toggle */}
          <button
            onClick={() => setIsTestPlayMode(!isTestPlayMode)}
            className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg cursor-pointer ${
              isTestPlayMode
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isTestPlayMode ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Keluar Test</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Test Scroll</span>
              </>
            )}
          </button>

          {/* Template Mode Link */}
          <Link
            href={`/template/${project.slug}`}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Buka Form Template"
          >
            <Edit3 className="w-4 h-4 text-sky-400" />
            <span className="hidden lg:inline">Mode Template</span>
          </Link>

          {/* View Link */}
          <Link
            href={`/view/${project.slug}`}
            target="_blank"
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            title="Lihat Undangan Tamu"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">View</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>

          {/* Versioning Actions */}
          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Buka Riwayat Versi & Rollback"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Versi:</span>
            <span className="font-mono text-amber-300">v{activeVersionNumber}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaveVersionModalOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Simpan sebagai Versi Baru Bernama"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">+Versi</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </header>

      {/* SAVE TOAST */}
      {saveNotice && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-sm">
          <CheckCircle2 className="w-5 h-5" />
          Undangan berhasil disimpan!
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL: PAGE SECTION MANAGER & VISUAL BACKGROUND / GRADIENT PICKER */}
        {!isTestPlayMode && (
          <aside className="w-72 xl:w-80 border-r border-slate-800 bg-slate-900/90 flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Halaman ({project.pages.length})
              </span>
              <button
                onClick={addPage}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> +Halaman
              </button>
            </div>

            {/* Pages List */}
            <div className="p-2.5 overflow-y-auto max-h-52 shrink-0 space-y-1.5 border-b border-slate-800">
              {sortedPages.map((page, idx) => (
                <div
                  key={page.id}
                  onClick={() => handleSelectPageFromSidebar(page.id)}
                  className={`p-2 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedPageId === page.id
                      ? 'border-indigo-400 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span
                      className="w-5 h-5 rounded border border-slate-600 text-slate-900 [text-shadow:0_0_3px_rgba(255,255,255,0.95)] flex items-center justify-center font-bold text-[10px] shrink-0 shadow-inner"
                      style={{
                        backgroundColor:
                          page.background.type === 'color'
                            ? page.background.value
                            : '#ffffff',
                        backgroundImage:
                          page.background.type === 'gradient'
                            ? page.background.value
                            : page.background.type === 'image'
                            ? `url(${page.background.value})`
                            : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-white truncate">{page.title}</div>
                      <div className="text-[10px] text-slate-400">
                        {page.elements.length} Layer •{' '}
                        {page.background.type === 'gradient'
                          ? 'Gradien'
                          : page.background.type === 'image'
                          ? 'Gambar'
                          : 'Solid'}
                      </div>
                    </div>
                  </div>

                  {/* Page Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        movePage(page.id, 'up');
                      }}
                      disabled={idx === 0}
                      className="p-1 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer"
                      title="Geser Naik"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        movePage(page.id, 'down');
                      }}
                      disabled={idx === sortedPages.length - 1}
                      className="p-1 hover:text-white text-slate-400 disabled:opacity-30 cursor-pointer"
                      title="Geser Turun"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePage(page.id);
                      }}
                      className="p-1 hover:text-sky-400 text-slate-400 cursor-pointer"
                      title="Duplikat Halaman"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {project.pages.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePage(page.id);
                        }}
                        className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer"
                        title="Hapus Halaman"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Page Background & Height Settings */}
            {currentPage && (
              <div className="p-3 bg-slate-950/60 space-y-3 overflow-y-auto flex-1">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  Pengaturan Halaman
                </span>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Judul Halaman</label>
                  <input
                    type="text"
                    value={currentPage.title}
                    onChange={(e) => updatePage(currentPage.id, { title: e.target.value })}
                    className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Tipe Latar</label>
                    <select
                      value={currentPage.background.type}
                      onChange={(e) => {
                        const nextType = e.target.value as 'color' | 'gradient' | 'image';
                        recordSnapshot();
                        const prevVal = currentPage.background.value || '';
                        let nextVal = prevVal;

                        if (nextType === 'gradient') {
                          if (!prevVal.toLowerCase().includes('gradient(')) {
                            const startHex = prevVal.startsWith('#') ? prevVal : '#ffffff';
                            const endHex =
                              startHex.toLowerCase() === '#ffffff' ? '#f1f5f9' : '#ffffff';
                            nextVal = `linear-gradient(180deg, ${startHex} 0%, #f8fafc 50%, ${endHex} 100%)`;
                          }
                        } else if (nextType === 'color') {
                          if (!prevVal.startsWith('#')) {
                            nextVal = extractPrimaryHexFromBackground(prevVal);
                          }
                        } else if (nextType === 'image') {
                          if (
                            prevVal.startsWith('#') ||
                            prevVal.toLowerCase().includes('gradient(')
                          ) {
                            nextVal =
                              'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=80';
                          }
                        }

                        updatePage(currentPage.id, {
                          background: {
                            ...currentPage.background,
                            type: nextType,
                            value: nextVal
                          }
                        });
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="color">Warna Solid</option>
                      <option value="gradient">Gradien Warna</option>
                      <option value="image">Gambar Latar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Tinggi Kanvas (px)
                    </label>
                    <input
                      type="number"
                      min={300}
                      max={2000}
                      step={50}
                      value={currentStageHeight}
                      onChange={(e) => {
                        const val = Math.max(
                          300,
                          Math.min(2000, parseInt(e.target.value, 10) || 600)
                        );
                        updatePage(currentPage.id, { stageHeight: val });
                      }}
                      className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                {/* A. SOLID COLOR PICKER */}
                {currentPage.background.type === 'color' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Pilih Warna Latar Solid
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          currentPage.background.value.startsWith('#')
                            ? currentPage.background.value
                            : '#ffffff'
                        }
                        onPointerDown={recordSnapshot}
                        onChange={(e) =>
                          updatePage(currentPage.id, {
                            background: {
                              ...currentPage.background,
                              value: e.target.value
                            }
                          })
                        }
                        className="w-9 h-8 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={currentPage.background.value}
                        onChange={(e) =>
                          updatePage(currentPage.id, {
                            background: {
                              ...currentPage.background,
                              value: e.target.value
                            }
                          })
                        }
                        placeholder="#ffffff"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* B. VISUAL MULTI-STOP GRADIENT COLOR PICKER */}
                {currentPage.background.type === 'gradient' && (
                  <GradientPicker
                    value={currentPage.background.value}
                    onBeforeTransform={recordSnapshot}
                    onChange={(nextCss) =>
                      updatePage(currentPage.id, {
                        background: {
                          ...currentPage.background,
                          value: nextCss
                        }
                      })
                    }
                  />
                )}

                {/* C. BACKGROUND IMAGE PICKER */}
                {currentPage.background.type === 'image' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] text-slate-400 mb-1">
                      URL Gambar Latar
                    </label>
                    <input
                      type="text"
                      value={currentPage.background.value}
                      onChange={(e) =>
                        updatePage(currentPage.id, {
                          background: {
                            ...currentPage.background,
                            value: e.target.value
                          }
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAssetModalTarget({
                          kind: 'page_background',
                          pageId: currentPage.id
                        })
                      }
                      className="w-full py-1.5 px-2.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-xs text-sky-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Pilih / Upload Background
                    </button>
                  </div>
                )}

                {/* D. OVERLAY DARKNESS SLIDER */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span>Redup Latar (Overlay Gelap)</span>
                    <span className="font-mono text-slate-300">
                      {Math.round((currentPage.background.overlayOpacity ?? 0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={0.85}
                    step={0.05}
                    value={currentPage.background.overlayOpacity ?? 0}
                    onPointerDown={recordSnapshot}
                    onChange={(e) =>
                      updatePage(currentPage.id, {
                        background: {
                          ...currentPage.background,
                          overlayOpacity: parseFloat(e.target.value)
                        }
                      })
                    }
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </aside>
        )}

        {/* CENTER VIEWPORT (FREEFORM SCROLLABLE CANVAS OR TEST PLAY) */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {isTestPlayMode ? (
            <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center">
              <div className="w-full max-w-3xl">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" />
                    Mode Uji Coba Scroll Aktif — Scroll ke bawah untuk melihat posisi, rotasi, skala & animasi
                  </span>
                  <span>Tekan &lsquo;Keluar Test&rsquo; untuk kembali mengedit</span>
                </div>
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                  <VerticalScrollEngine
                    project={project}
                    mode="test"
                    onExitTestMode={() => setIsTestPlayMode(false)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Sticky Top Canvas Control Bar */}
              <div className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Scroll All vs Single Page */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setCanvasViewMode('all_scroll')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        canvasViewMode === 'all_scroll'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Semua Halaman (Scroll)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasViewMode('single_page')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        canvasViewMode === 'single_page'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fokus 1 Halaman
                    </button>
                  </div>

                  {/* Stage Width Format: Desktop (800px) vs Mobile Portrait (480px) */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        recordSnapshot();
                        setProject((prev) => ({
                          ...prev,
                          globalTheme: { ...prev.globalTheme, stageWidth: 800 }
                        }));
                      }}
                      className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                        stageWidth > 540
                          ? 'bg-slate-700 text-amber-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Kanvas Lebar 800px (Cocok untuk layout berdampingan)"
                    >
                      <Monitor className="w-3 h-3" /> 800px
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        recordSnapshot();
                        setProject((prev) => ({
                          ...prev,
                          globalTheme: { ...prev.globalTheme, stageWidth: 480 }
                        }));
                      }}
                      className={`px-2 py-1 rounded-md flex items-center gap-1 transition cursor-pointer ${
                        stageWidth <= 540
                          ? 'bg-slate-700 text-amber-300'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="Kanvas Potret Mobile 480px (Cocok untuk undangan vertikal HP)"
                    >
                      <Smartphone className="w-3 h-3" /> 480px
                    </button>
                  </div>

                  {/* Helper Grid Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowGrid(!showGrid)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                      showGrid
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title="Tampilkan Garis Bantu Grid & Tengah"
                  >
                    <Grid3X3 className="w-3.5 h-3.5" /> Grid
                  </button>
                </div>

                {/* Quick Add to Active Page */}
                {currentPage && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAssetModalTarget({
                          kind: 'new_element_image',
                          pageId: currentPage.id
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-xs font-bold text-sky-300 flex items-center gap-1 transition cursor-pointer"
                      title="Upload Foto / Pilih Ornamen dari Asset Library ke Halaman Aktif"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> +Upload / Library
                    </button>
                    <button
                      type="button"
                      onClick={() => addElementToPage(currentPage.id, 'image')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-sky-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> +Gambar
                    </button>
                    <button
                      type="button"
                      onClick={() => addElementToPage(currentPage.id, 'text')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Type className="w-3.5 h-3.5" /> +Teks
                    </button>
                    <button
                      type="button"
                      onClick={() => addElementToPage(currentPage.id, 'button')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                    >
                      <MousePointer className="w-3.5 h-3.5" /> +Tombol
                    </button>
                  </div>
                )}
              </div>

              {/* Scrollable Freeform Pages Viewport */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-8 space-y-12 flex flex-col items-center">
                {pagesToRender.map((page) => {
                  const globalIdx = sortedPages.findIndex((p) => p.id === page.id);
                  return (
                    <StagePageCanvas
                      key={page.id}
                      page={page}
                      pageIndex={globalIdx >= 0 ? globalIdx : 0}
                      totalPages={sortedPages.length}
                      stageWidth={stageWidth}
                      defaultFontFamily={project.globalTheme?.fontFamily}
                      isActivePage={selectedPageId === page.id}
                      selectedElementId={
                        selectedPageId === page.id ? selectedElementId : null
                      }
                      showGrid={showGrid}
                      containerDomRef={(node) => {
                        pageDomRefs.current[page.id] = node;
                      }}
                      onSelectPage={(pid) => {
                        if (selectedPageId !== pid) {
                          setSelectedPageId(pid);
                          setSelectedElementId(null);
                        }
                      }}
                      onSelectElement={(pid, eid) => {
                        setSelectedPageId(pid);
                        setSelectedElementId(eid);
                      }}
                      onTransformStart={recordSnapshot}
                      onUpdateElement={updateElementOnPage}
                      onOpenAssetLibraryForElement={(pid, eid) =>
                        setAssetModalTarget({
                          kind: 'element_image',
                          pageId: pid,
                          elementId: eid
                        })
                      }
                      onDuplicateElement={duplicateElementOnPage}
                      onRemoveElement={removeElementOnPage}
                      onAddElementToPage={(pid, type) => addElementToPage(pid, type)}
                    />
                  );
                })}

                {canvasViewMode === 'all_scroll' && (
                  <button
                    type="button"
                    onClick={addPage}
                    className="px-5 py-3 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-400 bg-slate-900/50 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-300 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Halaman Baru di Bawah
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL: ALWAYS MOUNTED IN EDIT MODE (NO LAYOUT SHIFT!) */}
        {!isTestPlayMode && (
          <aside className="w-80 border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden">
            {!selectedElement ? (
              /* LAYER STACK PANEL FOR CURRENT PAGE */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Daftar Layer ({currentPage?.elements.length || 0})
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                    {currentPage?.title}
                  </span>
                </div>

                {/* Quick Tips Banner */}
                <div className="mx-3 mt-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-slate-300 leading-relaxed space-y-1">
                  <div className="font-bold text-indigo-300 flex items-center gap-1">
                    <Move className="w-3.5 h-3.5" /> Kontrol Kanvas Bebas:
                  </div>
                  <p className="text-slate-400">
                    • Klik &amp; geser elemen di kanvas untuk atur <b>Posisi</b>.
                    <br />• Tarik gagang atas untuk <b>Rotasi</b> (Shift = 15°).
                    <br />• Tarik titik sudut untuk <b>Skala</b>, titik sisi untuk <b>Ukuran</b>.
                    <br />• Klik 2× pada gambar untuk ganti/upload foto.
                  </p>
                </div>

                {/* Layer Stack List (Top Z-Index first) */}
                <div className="p-3 overflow-y-auto flex-1 space-y-1.5">
                  {!currentPage || currentPage.elements.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500">
                      Belum ada elemen di halaman ini.
                    </div>
                  ) : (
                    currentPage.elements
                      .slice()
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((el) => (
                        <div
                          key={el.id}
                          onClick={() => setSelectedElementId(el.id)}
                          className={`p-2 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between gap-2 cursor-pointer text-xs ${
                            el.hidden ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                              {el.type === 'image' ? (
                                <img
                                  src={
                                    el.mediaUrl ||
                                    el.spriteAsset?.frames?.[0] ||
                                    'https://via.placeholder.com/60'
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : el.type === 'text' ? (
                                <Type className="w-4 h-4 text-amber-400" />
                              ) : (
                                <MousePointer className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-200 truncate">
                                {el.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                z:{el.zIndex} • {Math.round(el.x)}%,{Math.round(el.y)}% •{' '}
                                {Math.round(el.rotation ?? 0)}° •{' '}
                                {Math.round((el.scale ?? 1) * 100)}%
                              </div>
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                updateElement(el.id, { hidden: !el.hidden })
                              }
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                              title={el.hidden ? 'Tampilkan Elemen' : 'Sembunyikan Elemen'}
                            >
                              {el.hidden ? (
                                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateElement(el.id, { locked: !el.locked })
                              }
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                              title={el.locked ? 'Buka Kunci' : 'Kunci Posisi'}
                            >
                              {el.locked ? (
                                <Lock className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                duplicateElementOnPage(currentPage.id, el.id)
                              }
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-sky-400 cursor-pointer"
                              title="Duplikat"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              /* SELECTED ELEMENT INSPECTOR */
              <>
                {/* Selected Element Header Bar */}
                <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedElementId(null)}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Daftar Layer</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateElement(selectedElement.id, {
                          hidden: !selectedElement.hidden
                        })
                      }
                      className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer ${
                        selectedElement.hidden ? 'text-rose-400' : 'text-slate-300'
                      }`}
                      title={selectedElement.hidden ? 'Tampilkan' : 'Sembunyikan'}
                    >
                      {selectedElement.hidden ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateElement(selectedElement.id, {
                          locked: !selectedElement.locked
                        })
                      }
                      className={`p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer ${
                        selectedElement.locked ? 'text-amber-400' : 'text-slate-300'
                      }`}
                      title={
                        selectedElement.locked
                          ? 'Buka Kunci Elemen'
                          : 'Kunci Elemen agar Tidak Tergeser'
                      }
                    >
                      {selectedElement.locked ? (
                        <Lock className="w-3.5 h-3.5" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        currentPage &&
                        duplicateElementOnPage(currentPage.id, selectedElement.id)
                      }
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 transition cursor-pointer"
                      title="Duplikat Elemen (Ctrl+D)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        currentPage &&
                        removeElementOnPage(currentPage.id, selectedElement.id)
                      }
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="Hapus Elemen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inspector Tabs */}
                <div className="flex border-b border-slate-800 px-3 pt-2.5 gap-2.5 text-[11px] font-bold">
                  <button
                    onClick={() => setInspectorTab('content')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'content'
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Transform &amp; Konten
                  </button>
                  <button
                    onClick={() => setInspectorTab('animation')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'animation'
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Animasi
                  </button>
                  <button
                    onClick={() => setInspectorTab('interaction')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'interaction'
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Interaksi
                  </button>
                  <button
                    onClick={() => setInspectorTab('template')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'template'
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Template
                  </button>
                </div>

                {/* Inspector Body */}
                <div className="p-3.5 overflow-y-auto flex-1 space-y-4 text-xs">
                  {/* TAB 1: TRANSFORMASI BEBAS (POSISI, ROTASI, SKALA) + KONTEN + Z-INDEX */}
                  {inspectorTab === 'content' && (
                    <div className="space-y-4">
                      {/* SECTION A: TRANSFORMASI POSISI, ROTASI, SKALA */}
                      <div className="p-3 rounded-xl bg-slate-800/45 border border-slate-700/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5" />
                            Posisi, Rotasi &amp; Skala
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              recordSnapshot();
                              updateElement(selectedElement.id, {
                                rotation: 0,
                                scale: 1,
                                flipX: false,
                                flipY: false
                              });
                            }}
                            className="text-[10px] text-slate-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                            title="Reset Rotasi, Skala & Cermin"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset
                          </button>
                        </div>

                        {/* X & Y Coordinates */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Posisi X (%)
                            </label>
                            <input
                              type="number"
                              step={0.5}
                              min={-50}
                              max={150}
                              disabled={selectedElement.locked}
                              value={selectedElement.x}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  x: parseFloat(e.target.value) || 0
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono disabled:opacity-50"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              Posisi Y (%)
                            </label>
                            <input
                              type="number"
                              step={0.5}
                              min={-50}
                              max={150}
                              disabled={selectedElement.locked}
                              value={selectedElement.y}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  y: parseFloat(e.target.value) || 0
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Quick Alignment Buttons */}
                        <div className="grid grid-cols-6 gap-1">
                          {[
                            { label: 'Kiri', prop: 'x', val: 18 },
                            { label: 'Tgh X', prop: 'x', val: 50 },
                            { label: 'Kanan', prop: 'x', val: 82 },
                            { label: 'Atas', prop: 'y', val: 16 },
                            { label: 'Tgh Y', prop: 'y', val: 50 },
                            { label: 'Bawah', prop: 'y', val: 84 }
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              disabled={selectedElement.locked}
                              onClick={() => {
                                recordSnapshot();
                                updateElement(selectedElement.id, {
                                  [preset.prop]: preset.val
                                });
                              }}
                              className="py-1 rounded bg-slate-900 hover:bg-slate-700 border border-slate-700/80 text-[10px] text-slate-300 font-semibold transition cursor-pointer disabled:opacity-40"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* SCALE (SKALA) */}
                        <div className="space-y-1 pt-1 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Skala (Scale)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={10}
                                max={500}
                                step={5}
                                disabled={selectedElement.locked}
                                value={Math.round((selectedElement.scale ?? 1) * 100)}
                                onChange={(e) => {
                                  const pct = Math.max(
                                    10,
                                    Math.min(500, parseFloat(e.target.value) || 100)
                                  );
                                  updateElement(selectedElement.id, {
                                    scale: Math.round(pct) / 100
                                  });
                                }}
                                className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right font-mono text-[11px] text-amber-300"
                              />
                              <span className="text-[10px] text-slate-400">%</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={0.1}
                            max={3.5}
                            step={0.05}
                            disabled={selectedElement.locked}
                            value={selectedElement.scale ?? 1}
                            onPointerDown={recordSnapshot}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                scale: parseFloat(e.target.value)
                              })
                            }
                            className="w-full accent-indigo-400 cursor-pointer"
                          />
                        </div>

                        {/* ROTATION (ROTASI) */}
                        <div className="space-y-1.5 pt-1 border-t border-slate-800">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Rotasi (Putar)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={-180}
                                max={180}
                                step={1}
                                disabled={selectedElement.locked}
                                value={Math.round(selectedElement.rotation ?? 0)}
                                onChange={(e) => {
                                  const deg = Math.max(
                                    -180,
                                    Math.min(180, parseFloat(e.target.value) || 0)
                                  );
                                  updateElement(selectedElement.id, { rotation: deg });
                                }}
                                className="w-16 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-right font-mono text-[11px] text-indigo-300"
                              />
                              <span className="text-[10px] text-slate-400">°</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            disabled={selectedElement.locked}
                            value={selectedElement.rotation ?? 0}
                            onPointerDown={recordSnapshot}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                rotation: parseFloat(e.target.value)
                              })
                            }
                            className="w-full accent-indigo-400 cursor-pointer"
                          />
                          <div className="grid grid-cols-5 gap-1">
                            {[-90, -45, 0, 45, 90].map((deg) => (
                              <button
                                key={deg}
                                type="button"
                                disabled={selectedElement.locked}
                                onClick={() => {
                                  recordSnapshot();
                                  updateElement(selectedElement.id, { rotation: deg });
                                }}
                                className={`py-1 rounded border text-[10px] font-mono transition cursor-pointer ${
                                  Math.round(selectedElement.rotation ?? 0) === deg
                                    ? 'bg-indigo-600 border-indigo-400 text-white'
                                    : 'bg-slate-900 hover:bg-slate-700 border-slate-700/80 text-slate-300'
                                }`}
                              >
                                {deg > 0 ? `+${deg}°` : `${deg}°`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* FLIP & BASE WIDTH/HEIGHT */}
                        <div className="pt-2 border-t border-slate-800 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={selectedElement.locked}
                              onClick={() => {
                                recordSnapshot();
                                updateElement(selectedElement.id, {
                                  flipX: !selectedElement.flipX
                                });
                              }}
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                selectedElement.flipX
                                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                                  : 'bg-slate-900 hover:bg-slate-700 border-slate-700 text-slate-300'
                              }`}
                            >
                              <FlipHorizontal2 className="w-3.5 h-3.5" /> Flip H
                            </button>
                            <button
                              type="button"
                              disabled={selectedElement.locked}
                              onClick={() => {
                                recordSnapshot();
                                updateElement(selectedElement.id, {
                                  flipY: !selectedElement.flipY
                                });
                              }}
                              className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                selectedElement.flipY
                                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200'
                                  : 'bg-slate-900 hover:bg-slate-700 border-slate-700 text-slate-300'
                              }`}
                            >
                              <FlipVertical2 className="w-3.5 h-3.5" /> Flip V
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Lebar Dasar (px)
                              </label>
                              <input
                                type="number"
                                min={24}
                                max={1400}
                                disabled={selectedElement.locked}
                                value={selectedElement.width}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    width: Math.max(24, parseInt(e.target.value, 10) || 100)
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">
                                Tinggi Dasar (px)
                              </label>
                              <input
                                type="number"
                                min={24}
                                max={1600}
                                disabled={selectedElement.locked}
                                value={selectedElement.height}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    height: Math.max(24, parseInt(e.target.value, 10) || 100)
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION B: KONTEN & GAYA TAMPILAN */}
                      <div className="p-3 rounded-xl bg-slate-800/35 border border-slate-800 space-y-3">
                        <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
                          Konten &amp; Gaya Visual
                        </span>

                        <div>
                          <label className="block text-slate-400 mb-1">Nama Layer</label>
                          <input
                            type="text"
                            value={selectedElement.name}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { name: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>

                        {/* IMAGE SPECIFIC CONTROLS */}
                        {selectedElement.type === 'image' && (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() =>
                                currentPage &&
                                setAssetModalTarget({
                                  kind: 'element_image',
                                  pageId: currentPage.id,
                                  elementId: selectedElement.id
                                })
                              }
                              className="w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" /> Upload / Pilih dari Asset Library
                            </button>

                            <div>
                              <label className="block text-slate-400 mb-1">URL Gambar</label>
                              <input
                                type="text"
                                value={selectedElement.mediaUrl || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    mediaUrl: e.target.value,
                                    spriteAsset: undefined
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]"
                              />
                            </div>

                            <div>
                              <label className="block text-slate-400 mb-1">
                                Mode Gambar (Object Fit)
                              </label>
                              <select
                                value={
                                  selectedElement.styleOptions?.objectFit ||
                                  (selectedElement.spriteAsset ? 'contain' : 'cover')
                                }
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    styleOptions: {
                                      ...selectedElement.styleOptions,
                                      objectFit: e.target.value as 'cover' | 'contain' | 'fill'
                                    }
                                  })
                                }
                                className="w-full px-2 py-1.5 rounded bg-slate-800 border border-slate-700 text-white"
                              >
                                <option value="contain">Contain (Utuh / PNG Transparan)</option>
                                <option value="cover">Cover (Crop Penuh Kotak/Lingkaran)</option>
                                <option value="fill">Fill (Rentangkan Sesuai Kotak)</option>
                              </select>
                            </div>

                            {/* Border Radius */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-slate-400">Lengkungan Sudut</label>
                                <div className="flex gap-1">
                                  {[
                                    { label: 'Kotak', val: 0 },
                                    { label: '16px', val: 16 },
                                    { label: 'Bulat', val: 999 }
                                  ].map((b) => (
                                    <button
                                      key={b.label}
                                      type="button"
                                      onClick={() =>
                                        updateElement(selectedElement.id, {
                                          styleOptions: {
                                            ...selectedElement.styleOptions,
                                            borderRadius: b.val
                                          }
                                        })
                                      }
                                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 cursor-pointer"
                                    >
                                      {b.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={200}
                                step={2}
                                value={Math.min(
                                  200,
                                  selectedElement.styleOptions?.borderRadius ?? 0
                                )}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    styleOptions: {
                                      ...selectedElement.styleOptions,
                                      borderRadius: parseInt(e.target.value, 10)
                                    }
                                  })
                                }
                                className="w-full accent-indigo-400"
                              />
                            </div>
                          </div>
                        )}

                        {/* TEXT SPECIFIC CONTROLS */}
                        {selectedElement.type === 'text' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-slate-400 mb-1">Isi Teks</label>
                              <textarea
                                rows={3}
                                value={selectedElement.content || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    content: e.target.value
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">
                                  Ukuran Font (px)
                                </label>
                                <input
                                  type="number"
                                  min={8}
                                  max={120}
                                  value={selectedElement.styleOptions?.fontSize || 16}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        fontSize: parseInt(e.target.value, 10) || 16
                                      }
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-400 mb-1">Ketebalan</label>
                                <select
                                  value={selectedElement.styleOptions?.fontWeight || 'medium'}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        fontWeight: e.target.value as NonNullable<
                                          PageLayerElement['styleOptions']
                                        >['fontWeight']
                                      }
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="medium">Medium</option>
                                  <option value="semibold">Semibold</option>
                                  <option value="bold">Bold</option>
                                  <option value="extrabold">Extrabold</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">Gaya Font</label>
                                <select
                                  value={selectedElement.styleOptions?.fontFamily || 'sans'}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        fontFamily: e.target.value as 'sans' | 'serif' | 'mono'
                                      }
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                >
                                  <option value="sans">Sans Modern</option>
                                  <option value="serif">Serif Klasik</option>
                                  <option value="mono">Monospace</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-slate-400 mb-1">Rata Teks</label>
                                <select
                                  value={selectedElement.styleOptions?.textAlign || 'center'}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        textAlign: e.target.value as 'left' | 'center' | 'right'
                                      }
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                >
                                  <option value="left">Kiri</option>
                                  <option value="center">Tengah</option>
                                  <option value="right">Kanan</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">Warna Teks</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={selectedElement.styleOptions?.color || '#0f172a'}
                                    onChange={(e) =>
                                      updateElement(selectedElement.id, {
                                        styleOptions: {
                                          ...selectedElement.styleOptions,
                                          color: e.target.value
                                        }
                                      })
                                    }
                                    className="w-7 h-7 rounded bg-slate-800 border border-slate-700 cursor-pointer shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={selectedElement.styleOptions?.color || '#0f172a'}
                                    onChange={(e) =>
                                      updateElement(selectedElement.id, {
                                        styleOptions: {
                                          ...selectedElement.styleOptions,
                                          color: e.target.value
                                        }
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white font-mono text-[11px]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-slate-400 mb-1">Kotak Latar</label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="color"
                                    value={
                                      selectedElement.styleOptions?.backgroundColor || '#f1f5f9'
                                    }
                                    onChange={(e) =>
                                      updateElement(selectedElement.id, {
                                        styleOptions: {
                                          ...selectedElement.styleOptions,
                                          backgroundColor: e.target.value
                                        }
                                      })
                                    }
                                    className="w-7 h-7 rounded bg-slate-800 border border-slate-700 cursor-pointer shrink-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateElement(selectedElement.id, {
                                        styleOptions: {
                                          ...selectedElement.styleOptions,
                                          backgroundColor: selectedElement.styleOptions
                                            ?.backgroundColor
                                            ? undefined
                                            : '#f1f5f9'
                                        }
                                      })
                                    }
                                    className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 cursor-pointer"
                                  >
                                    {selectedElement.styleOptions?.backgroundColor
                                      ? 'Hapus Latar'
                                      : 'Pakai Latar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* BUTTON SPECIFIC CONTROLS */}
                        {selectedElement.type === 'button' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-slate-400 mb-1">Teks Tombol</label>
                              <input
                                type="text"
                                value={selectedElement.content || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, { content: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded bg-slate-800 border border-slate-700 text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-slate-400 mb-1">Warna Tombol</label>
                                <input
                                  type="color"
                                  value={
                                    selectedElement.styleOptions?.backgroundColor || '#d97706'
                                  }
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        backgroundColor: e.target.value
                                      }
                                    })
                                  }
                                  className="w-full h-8 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">Warna Teks</label>
                                <input
                                  type="color"
                                  value={selectedElement.styleOptions?.color || '#ffffff'}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        color: e.target.value
                                      }
                                    })
                                  }
                                  className="w-full h-8 rounded bg-slate-800 border border-slate-700 cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SHARED SHADOW & OPACITY */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                          <div>
                            <label className="block text-slate-400 mb-1">Bayangan (Shadow)</label>
                            <select
                              value={selectedElement.styleOptions?.shadow || 'none'}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  styleOptions: {
                                    ...selectedElement.styleOptions,
                                    shadow: e.target.value as NonNullable<
                                      PageLayerElement['styleOptions']
                                    >['shadow']
                                  }
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                            >
                              <option value="none">Tanpa Bayangan</option>
                              <option value="sm">Tipis (SM)</option>
                              <option value="md">Sedang (MD)</option>
                              <option value="lg">Tegas (LG)</option>
                              <option value="xl">Besar (XL)</option>
                              <option value="2xl">Dramatis (2XL)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1">
                              Opasitas (
                              {Math.round((selectedElement.styleOptions?.opacity ?? 1) * 100)}
                              %)
                            </label>
                            <input
                              type="range"
                              min={0.1}
                              max={1}
                              step={0.05}
                              value={selectedElement.styleOptions?.opacity ?? 1}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  styleOptions: {
                                    ...selectedElement.styleOptions,
                                    opacity: parseFloat(e.target.value)
                                  }
                                })
                              }
                              className="w-full accent-indigo-400 mt-1.5"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION C: LAYER Z-INDEX MANAGER */}
                      <div className="p-3 rounded-xl bg-slate-800/35 border border-slate-800 space-y-2">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          Urutan Tumpukan Layer (Z-Index: {selectedElement.zIndex})
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => bringElementForward(selectedElement.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            Majukan (+1)
                          </button>
                          <button
                            type="button"
                            onClick={() => sendElementBackward(selectedElement.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            Mundurkan (-1)
                          </button>
                          <button
                            type="button"
                            onClick={() => bringToFront(selectedElement.id)}
                            className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                          >
                            Paling Depan
                          </button>
                          <button
                            type="button"
                            onClick={() => sendToBack(selectedElement.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          >
                            Paling Belakang
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ANIMASI 3-STATE (ENTRY, IDLE, EXIT) */}
                  {inspectorTab === 'animation' && (
                    <div className="space-y-4">
                      {/* Seksi Animasi Masuk */}
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                        <span className="font-bold text-indigo-400 uppercase tracking-wider block">
                          1. Animasi Masuk (Entry)
                        </span>

                        <div>
                          <label className="block text-slate-400 mb-1">Tipe Efek Masuk</label>
                          <select
                            value={selectedElement.animation.entry.type}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                animation: {
                                  ...selectedElement.animation,
                                  entry: {
                                    ...selectedElement.animation.entry,
                                    type: e.target.value as EntryAnimationType
                                  }
                                }
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                          >
                            <option value="none">Tanpa Animasi (None)</option>
                            <option value="fade-in">Fade In (Muncul Halus)</option>
                            <option value="slide-up">Slide Up (Meluncur Naik)</option>
                            <option value="slide-down">Slide Down (Meluncur Turun)</option>
                            <option value="slide-left">Slide Left (Meluncur dari Kanan)</option>
                            <option value="slide-right">Slide Right (Meluncur dari Kiri)</option>
                            <option value="zoom-in">Zoom In (Membesar)</option>
                            <option value="bounce-in">Bounce In (Membal)</option>
                            <option value="flip-in">Flip In (Membalik)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-slate-400 mb-1">
                              Durasi ({selectedElement.animation.entry.duration}s)
                            </label>
                            <input
                              type="range"
                              min={0.2}
                              max={3}
                              step={0.1}
                              value={selectedElement.animation.entry.duration}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  animation: {
                                    ...selectedElement.animation,
                                    entry: {
                                      ...selectedElement.animation.entry,
                                      duration: parseFloat(e.target.value)
                                    }
                                  }
                                })
                              }
                              className="w-full accent-indigo-400"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 mb-1">
                              Delay ({selectedElement.animation.entry.delay}s)
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={2}
                              step={0.1}
                              value={selectedElement.animation.entry.delay}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  animation: {
                                    ...selectedElement.animation,
                                    entry: {
                                      ...selectedElement.animation.entry,
                                      delay: parseFloat(e.target.value)
                                    }
                                  }
                                })
                              }
                              className="w-full accent-indigo-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">
                            Kurva Gerak (Easing)
                          </label>
                          <select
                            value={selectedElement.animation.entry.easing || 'ease-out'}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                animation: {
                                  ...selectedElement.animation,
                                  entry: {
                                    ...selectedElement.animation.entry,
                                    easing: e.target.value as LayerElementEasing
                                  }
                                }
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                          >
                            <option value="ease-out">Ease Out (Halus Alami)</option>
                            <option value="ease-in-out">Ease In-Out</option>
                            <option value="spring">Spring (Pegas)</option>
                            <option value="bounce">Bounce (Memantul)</option>
                            <option value="linear">Linear</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">
                            Pemicu Animasi (Trigger)
                          </label>
                          <select
                            value={selectedElement.animation.entry.trigger}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                animation: {
                                  ...selectedElement.animation,
                                  entry: {
                                    ...selectedElement.animation.entry,
                                    trigger: e.target.value as TriggerType
                                  }
                                }
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                          >
                            <option value="scroll_reveal">Saat Masuk Layar (Scroll Reveal)</option>
                            <option value="timer">Jeda Waktu Otomatis (Timer)</option>
                            <option value="click_tap">Saat Disentuh / Klik (Click)</option>
                          </select>
                        </div>
                      </div>

                      {/* Seksi Animasi Diam (Idle Loop) */}
                      <div className="space-y-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                        <span className="font-bold text-amber-400 uppercase tracking-wider block">
                          2. Animasi Diam (Idle Loop)
                        </span>

                        <div>
                          <label className="block text-slate-400 mb-1">Tipe Gerakan Idle</label>
                          <select
                            value={selectedElement.animation.idle.type}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                animation: {
                                  ...selectedElement.animation,
                                  idle: {
                                    ...selectedElement.animation.idle,
                                    type: e.target.value as IdleAnimationType
                                  }
                                }
                              })
                            }
                            className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                          >
                            <option value="none">Diam Statis (None)</option>
                            <option value="float">Float (Mengambang Naik-Turun Halus)</option>
                            <option value="pulse">Pulse (Denyut Skala Lembut)</option>
                            <option value="shimmer">Shimmer (Kilau Cahaya Melintang)</option>
                            <option value="breathing">Breathing (Opasitas Nafas)</option>
                            <option value="sway">Sway (Goyangan Angin Lembut)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">
                            Kecepatan Loop ({selectedElement.animation.idle.duration}s per putaran)
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={8}
                            step={0.5}
                            value={selectedElement.animation.idle.duration}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                animation: {
                                  ...selectedElement.animation,
                                  idle: {
                                    ...selectedElement.animation.idle,
                                    duration: parseFloat(e.target.value)
                                  }
                                }
                              })
                            }
                            className="w-full accent-amber-400"
                          />
                        </div>
                      </div>

                      {/* Seksi Animasi Keluar (Exit) */}
                      <div className="space-y-2 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                        <span className="font-bold text-rose-400 uppercase tracking-wider block">
                          3. Animasi Keluar (Exit)
                        </span>
                        <select
                          value={selectedElement.animation.exit?.type || 'none'}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              animation: {
                                ...selectedElement.animation,
                                exit: {
                                  type: e.target.value as ExitAnimationType,
                                  duration: 0.6,
                                  delay: 0,
                                  trigger: 'scroll_reveal'
                                }
                              }
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                        >
                          <option value="none">Tidak Ada (Tetap di Layar)</option>
                          <option value="fade-out">Fade Out (Menghilang)</option>
                          <option value="slide-down">Slide Down (Meluncur Keluar ke Bawah)</option>
                          <option value="slide-up">Slide Up (Meluncur Keluar ke Atas)</option>
                          <option value="zoom-out">Zoom Out (Mengecil Menghilang)</option>
                          <option value="blur-out">Blur Out (Mengabur)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: INTERAKSI */}
                  {inspectorTab === 'interaction' && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
                        <input
                          type="checkbox"
                          checked={selectedElement.hasInteraction}
                          onChange={(e) =>
                            updateElement(selectedElement.id, {
                              hasInteraction: e.target.checked,
                              interaction: e.target.checked
                                ? selectedElement.interaction || {
                                    type: 'info',
                                    title: 'Judul Interaksi',
                                    content: 'Keterangan...'
                                  }
                                : undefined
                            })
                          }
                          className="w-4 h-4 rounded accent-indigo-500"
                        />
                        <span>Aktifkan Aksi Saat Diklik/Sentuh</span>
                      </label>

                      {selectedElement.hasInteraction && selectedElement.interaction && (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="block text-slate-400 mb-1">Tipe Aksi</label>
                            <select
                              value={selectedElement.interaction.type}
                              onChange={(e) =>
                                updateElement(selectedElement.id, {
                                  interaction: {
                                    ...selectedElement.interaction!,
                                    type: e.target.value as NonNullable<
                                      PageLayerElement['interaction']
                                    >['type']
                                  }
                                })
                              }
                              className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                            >
                              <option value="info">Info / Dialog Teks</option>
                              <option value="image">Lightbox Foto Fullscreen</option>
                              <option value="video">Pemutar Video (YouTube / MP4)</option>
                              <option value="rsvp">Form RSVP &amp; Doa Restu</option>
                              <option value="scroll_to_page">
                                Scroll Menuju Halaman Tertentu
                              </option>
                            </select>
                          </div>

                          {selectedElement.interaction.type === 'scroll_to_page' && (
                            <div>
                              <label className="block text-slate-400 mb-1">Target Halaman</label>
                              <select
                                value={selectedElement.interaction.targetPageId || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    interaction: {
                                      ...selectedElement.interaction!,
                                      targetPageId: e.target.value
                                    }
                                  })
                                }
                                className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                              >
                                <option value="">Pilih Target Halaman...</option>
                                {sortedPages.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {['info', 'image', 'video', 'rsvp'].includes(
                            selectedElement.interaction.type
                          ) && (
                            <>
                              <div>
                                <label className="block text-slate-400 mb-1">
                                  Judul Modal Dialog
                                </label>
                                <input
                                  type="text"
                                  value={selectedElement.interaction.title || ''}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      interaction: {
                                        ...selectedElement.interaction!,
                                        title: e.target.value
                                      }
                                    })
                                  }
                                  className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                />
                              </div>

                              <div>
                                <label className="block text-slate-400 mb-1">
                                  Isi Keterangan / Dialog
                                </label>
                                <textarea
                                  rows={3}
                                  value={selectedElement.interaction.content || ''}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      interaction: {
                                        ...selectedElement.interaction!,
                                        content: e.target.value
                                      }
                                    })
                                  }
                                  className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white resize-none"
                                />
                              </div>
                            </>
                          )}

                          {selectedElement.interaction.type === 'info' && (
                            <>
                              <div>
                                <label className="block text-slate-400 mb-1">
                                  Teks Tombol Tautan (Opsional)
                                </label>
                                <input
                                  type="text"
                                  value={selectedElement.interaction.actionButtonText || ''}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      interaction: {
                                        ...selectedElement.interaction!,
                                        actionButtonText: e.target.value
                                      }
                                    })
                                  }
                                  placeholder="Buka Google Maps"
                                  className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-slate-400 mb-1">
                                  URL Tautan (Maps / Link Luar)
                                </label>
                                <input
                                  type="text"
                                  value={selectedElement.interaction.actionUrl || ''}
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      interaction: {
                                        ...selectedElement.interaction!,
                                        actionUrl: e.target.value
                                      }
                                    })
                                  }
                                  placeholder="https://maps.google.com/..."
                                  className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                                />
                              </div>
                            </>
                          )}

                          {['image', 'video'].includes(selectedElement.interaction.type) && (
                            <div className="space-y-1.5">
                              <label className="block text-slate-400 mb-1">
                                URL Media (Foto / Video)
                              </label>
                              <input
                                type="text"
                                value={selectedElement.interaction.mediaUrl || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    interaction: {
                                      ...selectedElement.interaction!,
                                      mediaUrl: e.target.value
                                    }
                                  })
                                }
                                placeholder="https://..."
                                className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-white"
                              />
                              {selectedElement.interaction.type === 'image' && currentPage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAssetModalTarget({
                                      kind: 'interaction_media',
                                      pageId: currentPage.id,
                                      elementId: selectedElement.id
                                    })
                                  }
                                  className="w-full py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" /> Pilih Foto Lightbox dari Library
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: TEMPLATE FORM FLAGS */}
                  {inspectorTab === 'template' && (
                    <div className="space-y-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <span className="font-bold text-amber-400 uppercase tracking-wider block">
                        Pengaturan Mode Template
                      </span>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedElement.editable_appearance}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                editable_appearance: e.target.checked
                              })
                            }
                            className="w-4 h-4 rounded accent-indigo-500"
                          />
                          <span>Boleh Ganti Tampilan / Gambar (Appearance)</span>
                        </label>
                        {selectedElement.editable_appearance && (
                          <input
                            type="text"
                            value={selectedElement.appearanceLabel || ''}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                appearanceLabel: e.target.value
                              })
                            }
                            placeholder="Label form (contoh: Foto Pasangan)"
                            className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 text-xs"
                          />
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedElement.editable_content}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                editable_content: e.target.checked
                              })
                            }
                            className="w-4 h-4 rounded accent-indigo-500"
                          />
                          <span>Boleh Ganti Teks / Konten (Content)</span>
                        </label>
                        {selectedElement.editable_content && (
                          <input
                            type="text"
                            value={selectedElement.contentLabel || ''}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                contentLabel: e.target.value
                              })
                            }
                            placeholder="Label form (contoh: Tanggal Acara)"
                            className="w-full px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 text-xs"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* ASSET LIBRARY MODAL */}
      <AssetLibraryModal
        isOpen={assetModalTarget !== null}
        onClose={() => setAssetModalTarget(null)}
        title={
          assetModalTarget?.kind === 'page_background'
            ? 'Pilih atau Upload Gambar Latar Halaman'
            : assetModalTarget?.kind === 'new_element_image'
            ? 'Tambah Gambar / Ornamen Baru ke Kanvas'
            : 'Pilih atau Upload Gambar'
        }
        onSelectSprite={(sprite: SpriteAsset) => {
          if (!assetModalTarget) return;
          recordSnapshot();

          if (assetModalTarget.kind === 'new_element_image') {
            addElementToPage(assetModalTarget.pageId, 'image', sprite);
          } else if (assetModalTarget.kind === 'element_image') {
            const targetPage = project.pages.find(
              (p) => p.id === assetModalTarget.pageId
            );
            const targetEl = targetPage?.elements.find(
              (e) => e.id === assetModalTarget.elementId
            );
            updateElementOnPage(assetModalTarget.pageId, assetModalTarget.elementId, {
              mediaUrl: sprite.frames[0],
              spriteAsset: sprite,
              styleOptions: {
                ...targetEl?.styleOptions,
                objectFit:
                  targetEl?.styleOptions?.objectFit ||
                  (sprite.id.startsWith('url-asset-') ? 'cover' : 'contain')
              }
            });
          } else if (assetModalTarget.kind === 'page_background') {
            const targetPage = project.pages.find(
              (p) => p.id === assetModalTarget.pageId
            );
            if (targetPage) {
              updatePage(targetPage.id, {
                background: {
                  ...targetPage.background,
                  type: 'image',
                  value: sprite.frames[0]
                }
              });
            }
          } else if (assetModalTarget.kind === 'interaction_media') {
            const targetPage = project.pages.find(
              (p) => p.id === assetModalTarget.pageId
            );
            const targetEl = targetPage?.elements.find(
              (e) => e.id === assetModalTarget.elementId
            );
            if (targetEl?.interaction) {
              updateElementOnPage(assetModalTarget.pageId, assetModalTarget.elementId, {
                interaction: {
                  ...targetEl.interaction,
                  mediaUrl: sprite.frames[0]
                }
              });
            }
          }

          setAssetModalTarget(null);
        }}
      />

      {/* VERSIONING MODALS */}
      <VersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        versions={versionList}
        currentVersionNumber={activeVersionNumber}
        onRestore={handleRestoreVersion}
        onToggleLock={async (id) => {
          const res = await toggleVersionLock(id);
          return res.ok;
        }}
        onRename={async (id, name) => {
          return await renameVersion(id, name);
        }}
        onRefresh={loadVersions}
      />

      <SaveVersionModal
        isOpen={isSaveVersionModalOpen}
        onClose={() => setIsSaveVersionModalOpen(false)}
        nextSuggestedNumber={(versionList[0]?.versionNumber ?? 0) + 1}
        onSaveVersion={handleCreateNamedVersion}
      />
    </div>
  );
}

type LayerElementEasing = VerticalScrollProject['pages'][number]['elements'][number]['animation']['entry']['easing'];
