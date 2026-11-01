'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  VerticalScrollProject,
  PageSection,
  PageLayerElement,
  PageSectionBackground,
  LayoutMode,
  FixedAlignment,
  EntryAnimationType,
  IdleAnimationType,
  ExitAnimationType,
  TriggerType
} from '@/types/verticalScroll';
import VerticalScrollEngine from '../runtime/VerticalScrollEngine';
import {
  getStageWidth,
  getPageStageHeight,
  getGlobalBackground,
  getOuterBackdrop,
  getEffectivePageBackground,
  buildBackgroundCSS
} from '../runtime/LayerElementView';
import StagePageCanvas from './StagePageCanvas';
import BackgroundConfigEditor from './BackgroundConfigEditor';
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
  Smartphone,
  SlidersHorizontal,
  MoreHorizontal,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  FileStack,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  LayoutTemplate
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
  | { kind: 'global_background' }
  | { kind: 'outer_backdrop' }
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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

  // Clean Canvas UI: Drawers, Panels & Floating Menus
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [leftDrawerTab, setLeftDrawerTab] = useState<'pages' | 'layers'>('pages');
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isRightPanelManuallyHidden, setIsRightPanelManuallyHidden] = useState(false);
  const [rightPageSubTab, setRightPageSubTab] = useState<'page' | 'global'>('page');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeHeaderMenu, setActiveHeaderMenu] = useState<'view' | 'more' | null>(null);

  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);

  // Close floating menus on outside pointerdown
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (
        activeHeaderMenu === 'view' &&
        viewMenuRef.current &&
        !viewMenuRef.current.contains(target)
      ) {
        setActiveHeaderMenu(null);
      }
      if (
        activeHeaderMenu === 'more' &&
        moreMenuRef.current &&
        !moreMenuRef.current.contains(target)
      ) {
        setActiveHeaderMenu(null);
      }
      if (
        isAddMenuOpen &&
        addMenuRef.current &&
        !addMenuRef.current.contains(target)
      ) {
        setIsAddMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [activeHeaderMenu, isAddMenuOpen]);

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
  const layoutMode: LayoutMode = project.globalTheme?.layoutMode || 'fluid';
  const fixedAlign: FixedAlignment = project.globalTheme?.fixedAlign || 'center';
  const globalBackground: PageSectionBackground = getGlobalBackground(project);
  const outerBackdrop: PageSectionBackground = getOuterBackdrop(project);

  const updateGlobalTheme = (
    updates: Partial<NonNullable<VerticalScrollProject['globalTheme']>>
  ) => {
    setProject((prev) => ({
      ...prev,
      globalTheme: {
        ...prev.globalTheme,
        ...updates
      }
    }));
  };

  const applyGlobalBackgroundToAllPages = () => {
    recordSnapshot();
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        useGlobalBackground: true
      }))
    }));
  };

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

      if (e.key === 'Escape') {
        if (isAddMenuOpen || activeHeaderMenu) {
          setIsAddMenuOpen(false);
          setActiveHeaderMenu(null);
          return;
        }
        if (selectedElementId) {
          setSelectedElementId(null);
          return;
        }
      }

      if (!selectedElementId || !currentPage) return;
      const el = currentPage.elements.find((item) => item.id === selectedElementId);
      if (!el) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateElementOnPage(currentPage.id, el.id);
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
    isAddMenuOpen,
    activeHeaderMenu,
    selectedElementId,
    currentPage,
    handleUndo,
    handleRedo,
    duplicateElementOnPage,
    removeElementOnPage,
    updateElementOnPage
  ]);

  // Deteksi otomatis halaman aktif saat scroll di kanvas
  useEffect(() => {
    if (isTestPlayMode || canvasViewMode !== 'all_scroll') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const containerBounds = container.getBoundingClientRect();
        // Target titik tengah vertikal viewport editor
        const targetCenterY = containerBounds.top + containerBounds.height * 0.45;

        let closestPageId: string | null = null;
        let minDistance = Infinity;

        sortedPages.forEach((page) => {
          const el = pageDomRefs.current[page.id];
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const pageCenterY = rect.top + rect.height / 2;
          const dist = Math.abs(pageCenterY - targetCenterY);

          // Prioritaskan halaman yang saat ini sedang melintasi targetCenterY
          if (rect.top <= targetCenterY && rect.bottom >= targetCenterY) {
            closestPageId = page.id;
            minDistance = -1; // Prioritas pasti
          } else if (minDistance >= 0 && dist < minDistance) {
            minDistance = dist;
            closestPageId = page.id;
          }
        });

        if (closestPageId && closestPageId !== selectedPageId) {
          setSelectedPageId(closestPageId);
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [isTestPlayMode, canvasViewMode, sortedPages, selectedPageId]);

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
      useGlobalBackground: true,
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
    setIsAddMenuOpen(false);
    if (!isRightPanelManuallyHidden) {
      setIsRightPanelOpen(true);
    }
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

  const openLeftDrawer = (tab: 'pages' | 'layers') => {
    setLeftDrawerTab(tab);
    setIsLeftDrawerOpen(true);
  };

  const handleShowRightPanel = () => {
    setIsRightPanelOpen(true);
    setIsRightPanelManuallyHidden(false);
  };

  const handleHideRightPanel = () => {
    setIsRightPanelOpen(false);
    setIsRightPanelManuallyHidden(true);
  };

  // Klik halaman di drawer kiri -> fokus ke halaman & buka Pengaturan Halaman di kanan
  const handleSelectPageFromDrawer = (pageId: string) => {
    setSelectedPageId(pageId);
    setSelectedElementId(null);
    setRightPageSubTab('page');
    setIsRightPanelOpen(true);
    setIsRightPanelManuallyHidden(false);
    if (canvasViewMode === 'all_scroll') {
      pageDomRefs.current[pageId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Klik objek di kanvas / daftar layer -> hormati status hide manual panel kanan
  const handleSelectElement = (pageId: string, elementId: string | null) => {
    setSelectedPageId(pageId);
    setSelectedElementId(elementId);
    if (elementId !== null && !isRightPanelManuallyHidden) {
      setIsRightPanelOpen(true);
    }
  };

  const currentPageIndex = sortedPages.findIndex((p) => p.id === currentPage?.id);
  const activePageNum = (currentPageIndex >= 0 ? currentPageIndex : 0) + 1;

  const pagesToRender =
    canvasViewMode === 'single_page' && currentPage ? [currentPage] : sortedPages;

  return (
    <div className="h-screen bg-[#F4F8F5] text-[#1C2E24] flex flex-col select-none overflow-hidden">
      {/* CLEAN SINGLE TOP HEADER */}
      <header className="h-14 border-b border-[#E2EDE6] bg-white/95 backdrop-blur px-3 sm:px-4 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-full bg-[#F4F8F5] hover:bg-[#E8F3ED] text-[#1C2E24] border border-[#D2E5DA] transition shrink-0"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif font-bold text-[#1C2E24] text-sm truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {project.title}
            </span>
            <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8F3ED] text-[#2D5A43] border border-[#D2E5DA] shrink-0 font-semibold">
              v{activeVersionNumber}
            </span>
          </div>
        </div>

        {/* Compact Header Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {!isTestPlayMode && (
            <>
              {/* Undo / Redo */}
              <div className="hidden sm:flex items-center bg-[#F4F8F5] border border-[#D2E5DA] rounded-full p-0.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyPast.length === 0}
                  className="p-1.5 rounded-full hover:bg-white text-[#1C2E24] disabled:opacity-30 transition cursor-pointer"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyFuture.length === 0}
                  className="p-1.5 rounded-full hover:bg-white text-[#1C2E24] disabled:opacity-30 transition cursor-pointer"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grouped Canvas View Options Dropdown */}
              <div ref={viewMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveHeaderMenu((prev) => (prev === 'view' ? null : 'view'))
                  }
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    activeHeaderMenu === 'view'
                      ? 'bg-[#E8F3ED] border-[#2D5A43] text-[#2D5A43]'
                      : 'bg-[#F4F8F5] hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#1C2E24]'
                  }`}
                  title="Pengaturan Tampilan Kanvas (Mode Fluid/Fixed, Ukuran & Grid)"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D5A43]" />
                  <span className="hidden md:inline">Tampilan</span>
                  <span className="hidden lg:inline text-[10px] font-mono text-[#5A7765]">
                    {layoutMode === 'fixed' ? 'Fixed' : 'Fluid'} • {stageWidth}px
                  </span>
                  {(showGrid || canvasViewMode === 'single_page') && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]" />
                  )}
                </button>

                {activeHeaderMenu === 'view' && (
                  <div className="absolute right-0 mt-2 w-68 rounded-2xl bg-white/98 backdrop-blur-xl border border-[#D2E5DA] shadow-2xl p-3 space-y-3 z-50 text-xs text-[#1C2E24]">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A7765] mb-1.5">
                        Mode Kanvas Editor
                      </span>
                      <div className="grid grid-cols-2 gap-1 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA]">
                        <button
                          type="button"
                          onClick={() => setCanvasViewMode('all_scroll')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            canvasViewMode === 'all_scroll'
                              ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                              : 'text-[#5A7765] hover:text-[#1C2E24]'
                          }`}
                        >
                          Semua Scroll
                        </button>
                        <button
                          type="button"
                          onClick={() => setCanvasViewMode('single_page')}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                            canvasViewMode === 'single_page'
                              ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                              : 'text-[#5A7765] hover:text-[#1C2E24]'
                          }`}
                        >
                          Fokus 1 Hal
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A7765] mb-1.5">
                        Mode Lebar Tampilan Tamu
                      </span>
                      <div className="grid grid-cols-2 gap-1 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA] mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            recordSnapshot();
                            updateGlobalTheme({ layoutMode: 'fluid' });
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                            layoutMode === 'fluid'
                              ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                              : 'text-[#5A7765] hover:text-[#1C2E24]'
                          }`}
                        >
                          <Maximize2 className="w-3 h-3" /> Fluid
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            recordSnapshot();
                            updateGlobalTheme({ layoutMode: 'fixed' });
                          }}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                            layoutMode === 'fixed'
                              ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                              : 'text-[#5A7765] hover:text-[#1C2E24]'
                          }`}
                        >
                          <LayoutTemplate className="w-3 h-3" /> Fixed
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedElementId(null);
                          setRightPageSubTab('global');
                          handleShowRightPanel();
                          setActiveHeaderMenu(null);
                        }}
                        className="w-full py-1.5 px-2.5 rounded-xl bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-[#2D5A43] text-[11px] font-bold flex items-center justify-between transition cursor-pointer"
                      >
                        <span>Atur Ukuran, Posisi &amp; Latar Global</span>
                        <span>→</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-[#E2EDE6]">
                      <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className={`w-full py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition cursor-pointer ${
                          showGrid
                            ? 'bg-[#E8F3ED] border-[#2D5A43] text-[#2D5A43]'
                            : 'bg-white border-[#D2E5DA] text-[#5A7765] hover:text-[#1C2E24]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Grid3X3 className="w-3.5 h-3.5 text-[#2D5A43]" />
                          Garis Bantu Grid
                        </span>
                        <span className="text-[10px] font-mono font-bold">
                          {showGrid ? 'ON' : 'OFF'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Grouped Secondary Actions & Versioning Dropdown */}
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveHeaderMenu((prev) => (prev === 'more' ? null : 'more'))
                  }
                  className={`p-2 rounded-full border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    activeHeaderMenu === 'more'
                      ? 'bg-[#E8F3ED] border-[#2D5A43] text-[#2D5A43]'
                      : 'bg-[#F4F8F5] hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#1C2E24]'
                  }`}
                  title="Menu Lainnya (Mode Template, Live View & Riwayat Versi)"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeHeaderMenu === 'more' && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white/98 backdrop-blur-xl border border-[#D2E5DA] shadow-2xl p-1.5 space-y-0.5 z-50 text-xs text-[#1C2E24]">
                    <Link
                      href={`/template/${project.slug}`}
                      onClick={() => setActiveHeaderMenu(null)}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#F4F8F5] text-[#1C2E24] flex items-center gap-2.5 transition"
                    >
                      <Edit3 className="w-4 h-4 text-[#2D5A43] shrink-0" />
                      <div>
                        <div className="font-semibold">Mode Template</div>
                        <div className="text-[10px] text-[#5A7765]">
                          Buka form pengisian cepat
                        </div>
                      </div>
                    </Link>

                    <Link
                      href={`/view/${project.slug}`}
                      target="_blank"
                      onClick={() => setActiveHeaderMenu(null)}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#F4F8F5] text-[#1C2E24] flex items-center justify-between transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <Eye className="w-4 h-4 text-[#2D5A43] shrink-0" />
                        <span>
                          <span className="block font-semibold">Lihat Undangan Tamu</span>
                          <span className="block text-[10px] text-[#5A7765]">
                            Buka di tab baru
                          </span>
                        </span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#5A7765]" />
                    </Link>

                    <div className="my-1 border-t border-[#E2EDE6]" />

                    <button
                      type="button"
                      onClick={() => {
                        setActiveHeaderMenu(null);
                        setIsHistoryModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#F4F8F5] text-[#1C2E24] flex items-center justify-between transition cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-2.5">
                        <History className="w-4 h-4 text-[#2D5A43] shrink-0" />
                        <span>
                          <span className="block font-semibold">Riwayat Versi</span>
                          <span className="block text-[10px] text-[#5A7765]">
                            Pulihkan versi sebelumnya
                          </span>
                        </span>
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#E8F3ED] text-[#2D5A43] font-bold">
                        v{activeVersionNumber}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveHeaderMenu(null);
                        setIsSaveVersionModalOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl hover:bg-[#F4F8F5] text-[#2D5A43] flex items-center gap-2.5 transition cursor-pointer text-left font-semibold"
                    >
                      <BookmarkPlus className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="font-semibold">Simpan Versi Bernama</div>
                        <div className="text-[10px] text-[#5A7765]">
                          Buat checkpoint versi baru
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Test Scroll Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              setActiveHeaderMenu(null);
              setIsAddMenuOpen(false);
              setIsTestPlayMode(!isTestPlayMode);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
              isTestPlayMode
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-[#2D5A43] hover:bg-[#234734] text-white'
            }`}
          >
            {isTestPlayMode ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Keluar Test</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Test Scroll</span>
              </>
            )}
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-full bg-[#2D5A43] hover:bg-[#234734] disabled:bg-[#D2E5DA] text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-[#2D5A43]/20 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
          </button>
        </div>
      </header>

      {/* SAVE TOAST */}
      {saveNotice && (
        <div className="fixed top-16 right-6 z-50 bg-[#2D5A43] text-white font-bold px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 text-sm border border-[#D2E5DA]">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          Undangan berhasil disimpan!
        </div>
      )}

      {/* MAIN CLEAN CANVAS WORKSPACE */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* FLOATING TOP-LEFT TRIGGER: OPEN PAGES OR LAYERS DRAWER */}
        {!isTestPlayMode && !isLeftDrawerOpen && (
          <div className="absolute top-4 left-4 z-20 flex items-center bg-white/95 backdrop-blur-md border border-[#D2E5DA] rounded-full p-1 shadow-lg">
            <button
              type="button"
              onClick={() => openLeftDrawer('pages')}
              className="px-3 py-1.5 rounded-full hover:bg-[#F4F8F5] text-xs font-semibold text-[#1C2E24] flex items-center gap-1.5 transition cursor-pointer"
              title="Buka Daftar Halaman"
            >
              <FileStack className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
              <span>
                Hal {activePageNum}/{sortedPages.length}
              </span>
              {currentPage && (
                <span className="hidden sm:inline text-[#5A7765] font-normal truncate max-w-[110px]">
                  • {currentPage.title}
                </span>
              )}
            </button>

            <div className="w-px h-4 bg-[#D2E5DA] mx-0.5" />

            <button
              type="button"
              onClick={() => openLeftDrawer('layers')}
              className="px-3 py-1.5 rounded-full hover:bg-[#F4F8F5] text-xs font-semibold text-[#1C2E24] flex items-center gap-1.5 transition cursor-pointer"
              title="Buka Daftar Layer Halaman Aktif"
            >
              <Layers className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
              <span>Layer</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] font-mono text-[#2D5A43] font-bold">
                {currentPage?.elements.length || 0}
              </span>
            </button>
          </div>
        )}

        {/* SLIDE-OUT LEFT DRAWER: DAFTAR HALAMAN & DAFTAR LAYER */}
        {!isTestPlayMode && (
          <aside
            className={`absolute top-0 bottom-0 left-0 z-30 w-80 max-w-[88vw] border-r border-[#E2EDE6] bg-white/98 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out text-[#1C2E24] ${
              isLeftDrawerOpen
                ? 'translate-x-0'
                : '-translate-x-full pointer-events-none'
            }`}
          >
            {/* Left Drawer Header & Tab Switcher */}
            <div className="p-2.5 border-b border-[#E2EDE6] flex items-center gap-2 shrink-0">
              <div className="flex-1 grid grid-cols-2 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setLeftDrawerTab('pages')}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    leftDrawerTab === 'pages'
                      ? 'bg-[#2D5A43] text-white shadow'
                      : 'text-[#5A7765] hover:text-[#1C2E24]'
                  }`}
                >
                  <FileStack className="w-3.5 h-3.5" />
                  <span>Halaman ({project.pages.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeftDrawerTab('layers')}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    leftDrawerTab === 'layers'
                      ? 'bg-[#2D5A43] text-white shadow'
                      : 'text-[#5A7765] hover:text-[#1C2E24]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Layer ({currentPage?.elements.length || 0})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsLeftDrawerOpen(false)}
                className="p-2 rounded-xl bg-[#F4F8F5] hover:bg-[#E8F3ED] text-[#5A7765] hover:text-[#1C2E24] border border-[#D2E5DA] transition cursor-pointer shrink-0"
                title="Sembunyikan Panel Kiri"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {leftDrawerTab === 'pages' ? (
              /* TAB 1: DAFTAR HALAMAN */
              <>
                <div className="px-3.5 py-2.5 border-b border-[#E2EDE6] flex items-center justify-between shrink-0 bg-[#FBFDFB]">
                  <span className="text-[11px] text-[#5A7765]">
                    Klik halaman untuk atur di kanan
                  </span>
                  <button
                    type="button"
                    onClick={addPage}
                    className="px-3 py-1 rounded-full bg-[#2D5A43] hover:bg-[#234734] text-white text-xs font-semibold flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> +Halaman
                  </button>
                </div>

                <div className="p-2.5 overflow-y-auto flex-1 space-y-1.5">
                  {sortedPages.map((page, idx) => {
                    const effectiveBg = getEffectivePageBackground(page, project);
                    return (
                      <div
                        key={page.id}
                        onClick={() => handleSelectPageFromDrawer(page.id)}
                        className={`p-2.5 rounded-2xl border text-xs cursor-pointer transition flex items-center justify-between ${
                          selectedPageId === page.id
                            ? 'border-[#2D5A43] bg-[#E8F3ED] shadow-sm'
                            : 'border-[#E2EDE6] bg-[#FBFDFB] hover:bg-[#F4F8F5]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <span
                            className="w-7 h-7 rounded-xl border border-[#D2E5DA] text-[#1C2E24] [text-shadow:0_0_3px_rgba(255,255,255,0.95)] flex items-center justify-center font-bold text-[10px] shrink-0 shadow-inner"
                            style={buildBackgroundCSS(effectiveBg)}
                          >
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-[#1C2E24] truncate">
                              {page.title}
                            </div>
                            <div className="text-[10px] text-[#5A7765]">
                              {page.elements.length} Layer •{' '}
                              {page.useGlobalBackground
                                ? 'Latar Utama'
                                : page.background.type === 'gradient'
                                ? 'Gradien Custom'
                                : page.background.type === 'image'
                                ? 'Gambar Custom'
                                : 'Solid Custom'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(page.id, 'up');
                            }}
                            disabled={idx === 0}
                            className="p-1 hover:text-[#1C2E24] text-[#5A7765] disabled:opacity-30 cursor-pointer"
                            title="Geser Naik"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePage(page.id, 'down');
                            }}
                            disabled={idx === sortedPages.length - 1}
                            className="p-1 hover:text-[#1C2E24] text-[#5A7765] disabled:opacity-30 cursor-pointer"
                            title="Geser Turun"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePage(page.id);
                            }}
                            className="p-1 hover:text-[#2D5A43] text-[#5A7765] cursor-pointer"
                            title="Duplikat Halaman"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {project.pages.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removePage(page.id);
                              }}
                              className="p-1 hover:text-rose-500 text-[#5A7765] cursor-pointer"
                              title="Hapus Halaman"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              /* TAB 2: DAFTAR LAYER HALAMAN AKTIF */
              <>
                <div className="px-3.5 py-2.5 border-b border-[#E2EDE6] flex items-center justify-between gap-2 shrink-0 bg-[#FBFDFB]">
                  <span className="text-[11px] text-[#5A7765] truncate">
                    Hal {activePageNum}:{' '}
                    <b className="text-[#1C2E24]">{currentPage?.title}</b>
                  </span>
                  {currentPage && (
                    <button
                      type="button"
                      onClick={() => handleSelectPageFromDrawer(currentPage.id)}
                      className="text-[11px] font-semibold text-[#2D5A43] hover:text-[#234734] flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Buka Pengaturan Latar Halaman di Kanan"
                    >
                      <Palette className="w-3 h-3" />
                      <span>Atur Hal</span>
                    </button>
                  )}
                </div>

                <div className="p-2.5 overflow-y-auto flex-1 space-y-1.5">
                  {!currentPage || currentPage.elements.length === 0 ? (
                    <div className="text-center py-10 px-4 text-xs text-[#5A7765]">
                      Belum ada layer di halaman ini.
                      <br />
                      Klik tombol <b>(+)</b> di kiri bawah untuk menambah konten.
                    </div>
                  ) : (
                    currentPage.elements
                      .slice()
                      .sort((a, b) => b.zIndex - a.zIndex)
                      .map((el) => {
                        const isSelected = selectedElementId === el.id;
                        return (
                          <div
                            key={el.id}
                            onClick={() => handleSelectElement(currentPage.id, el.id)}
                            className={`p-2 rounded-2xl border transition flex items-center justify-between gap-2 cursor-pointer text-xs ${
                              isSelected
                                ? 'border-[#2D5A43] bg-[#E8F3ED] shadow-sm'
                                : 'border-[#E2EDE6] bg-[#FBFDFB] hover:bg-[#F4F8F5]'
                            } ${el.hidden ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white border border-[#D2E5DA] flex items-center justify-center overflow-hidden shrink-0">
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
                                  <Type className="w-4 h-4 text-[#2D5A43]" />
                                ) : (
                                  <MousePointer className="w-4 h-4 text-[#2D5A43]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-[#1C2E24] truncate">
                                  {el.name}
                                </div>
                                <div className="text-[10px] text-[#5A7765] font-mono">
                                  z:{el.zIndex}
                                  {el.locked ? ' • 🔒' : ''}
                                </div>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => bringElementForward(el.id)}
                                className="p-1 rounded-lg hover:bg-white text-[#5A7765] hover:text-[#1C2E24] cursor-pointer"
                                title="Naikkan Layer (+1)"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => sendElementBackward(el.id)}
                                className="p-1 rounded-lg hover:bg-white text-[#5A7765] hover:text-[#1C2E24] cursor-pointer"
                                title="Turunkan Layer (-1)"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateElement(el.id, { hidden: !el.hidden })
                                }
                                className="p-1 rounded-lg hover:bg-white text-[#5A7765] hover:text-[#1C2E24] cursor-pointer"
                                title={
                                  el.hidden
                                    ? 'Tampilkan Elemen'
                                    : 'Sembunyikan Elemen'
                                }
                              >
                                {el.hidden ? (
                                  <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateElement(el.id, { locked: !el.locked })
                                }
                                className="p-1 rounded-lg hover:bg-white text-[#5A7765] hover:text-[#1C2E24] cursor-pointer"
                                title={el.locked ? 'Buka Kunci' : 'Kunci Posisi'}
                              >
                                {el.locked ? (
                                  <Lock className="w-3.5 h-3.5 text-[#2D5A43]" />
                                ) : (
                                  <Unlock className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {!el.locked && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeElementOnPage(currentPage.id, el.id)
                                  }
                                  className="p-1 rounded-lg hover:bg-rose-50 text-[#5A7765] hover:text-rose-500 cursor-pointer"
                                  title="Hapus Layer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </aside>
        )}

        {/* FLOATING BOTTOM-LEFT (+) BUTTON: ADD CONTENT TO ACTIVE PAGE */}
        {!isTestPlayMode && currentPage && (
          <div
            ref={addMenuRef}
            className={`absolute bottom-6 z-30 transition-all duration-300 ${
              isLeftDrawerOpen ? 'left-6 lg:left-[21rem]' : 'left-6'
            }`}
          >
            {isAddMenuOpen && (
              <div className="absolute bottom-15 left-0 w-64 rounded-2xl bg-white/98 backdrop-blur-xl border border-[#D2E5DA] shadow-2xl p-2 space-y-1 text-xs text-[#1C2E24]">
                <div className="px-2.5 py-1.5 border-b border-[#E2EDE6] text-[10px] text-[#5A7765] truncate">
                  Tambah ke{' '}
                  <span className="font-bold text-[#2D5A43]">
                    Hal {activePageNum} ({currentPage.title})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => addElementToPage(currentPage.id, 'text')}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-[#F4F8F5] flex items-center gap-2.5 text-left transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] shrink-0">
                    <Type className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[#1C2E24]">Teks</div>
                    <div className="text-[10px] text-[#5A7765]">
                      Judul, nama mempelai, keterangan
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => addElementToPage(currentPage.id, 'image')}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-[#F4F8F5] flex items-center gap-2.5 text-left transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[#1C2E24]">Gambar</div>
                    <div className="text-[10px] text-[#5A7765]">
                      Blok foto atau ilustrasi
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    setAssetModalTarget({
                      kind: 'new_element_image',
                      pageId: currentPage.id
                    });
                  }}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-[#F4F8F5] flex items-center gap-2.5 text-left transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[#1C2E24]">
                      Upload / Asset Library
                    </div>
                    <div className="text-[10px] text-[#5A7765]">
                      Upload foto &amp; pilih ornamen
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => addElementToPage(currentPage.id, 'button')}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-[#F4F8F5] flex items-center gap-2.5 text-left transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#E8F3ED] border border-[#D2E5DA] flex items-center justify-center text-[#2D5A43] shrink-0">
                    <MousePointer className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[#1C2E24]">Tombol</div>
                    <div className="text-[10px] text-[#5A7765]">
                      RSVP, Google Maps, Video, Info
                    </div>
                  </div>
                </button>

                <div className="border-t border-[#E2EDE6] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    addPage();
                  }}
                  className="w-full px-2.5 py-2 rounded-xl hover:bg-[#F4F8F5] flex items-center gap-2.5 text-left transition cursor-pointer"
                >
                  <span className="w-8 h-8 rounded-lg bg-[#F4F8F5] border border-[#D2E5DA] flex items-center justify-center text-[#5A7765] shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-[#1C2E24]">Halaman Baru</div>
                    <div className="text-[10px] text-[#5A7765]">
                      Tambah seksi baru di bawah
                    </div>
                  </div>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAddMenuOpen((prev) => !prev)}
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(45,90,67,0.35)] border transition-all active:scale-95 cursor-pointer ${
                isAddMenuOpen
                  ? 'bg-[#1C2E24] border-[#2D5A43] text-white'
                  : 'bg-[#2D5A43] hover:bg-[#234734] border-[#2D5A43] text-white'
              }`}
              title="Tambah Konten ke Halaman Aktif"
            >
              <Plus
                className={`w-6 h-6 transition-transform duration-200 ${
                  isAddMenuOpen ? 'rotate-45' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* CENTER VIEWPORT (CLEAN FREEFORM SCROLLABLE CANVAS OR FULL-BLEED TEST PLAY) */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-[#EFF4F0]">
          {/* Live Workspace Outer Backdrop (Visible on Left & Right Sides) */}
          {!isTestPlayMode && (
            <div
              className="absolute inset-0 z-0 pointer-events-none transition-all duration-300"
              style={buildBackgroundCSS(layoutMode === 'fixed' ? outerBackdrop : globalBackground)}
            >
              {(layoutMode === 'fixed' ? outerBackdrop : globalBackground).overlayOpacity &&
              (layoutMode === 'fixed' ? outerBackdrop : globalBackground).overlayOpacity! > 0 ? (
                <div
                  className="absolute inset-0 bg-black pointer-events-none"
                  style={{
                    opacity: (layoutMode === 'fixed' ? outerBackdrop : globalBackground).overlayOpacity
                  }}
                />
              ) : null}
              {/* Subtle creative studio dot grid for depth & visual alignment */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, rgba(45,90,67,0.35) 1px, transparent 1px)',
                  backgroundSize: '24px 24px'
                }}
              />
            </div>
          )}

          {isTestPlayMode ? (
            <div className="flex-1 w-full h-full overflow-hidden relative z-10">
              <VerticalScrollEngine
                project={project}
                mode="test"
                onExitTestMode={() => setIsTestPlayMode(false)}
              />
            </div>
          ) : (
            <div
              ref={scrollContainerRef}
              className={`relative z-10 flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-24 space-y-12 flex flex-col ${
                layoutMode === 'fixed' && fixedAlign === 'left'
                  ? 'items-start pl-8 lg:pl-16 pr-8'
                  : layoutMode === 'fixed' && fixedAlign === 'right'
                  ? 'items-end pr-8 lg:pr-16 pl-8'
                  : 'items-center px-6'
              } transition-[padding] duration-300 ${
                isLeftDrawerOpen ? 'lg:pl-[21rem]' : ''
              } ${isRightPanelOpen ? 'lg:pr-[22rem]' : ''}`}
            >
              {pagesToRender.map((page) => {
                const globalIdx = sortedPages.findIndex((p) => p.id === page.id);
                return (
                  <StagePageCanvas
                    key={page.id}
                    page={page}
                    effectiveBackground={getEffectivePageBackground(page, project)}
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
                    onSelectElement={handleSelectElement}
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
                  />
                );
              })}

              {canvasViewMode === 'all_scroll' && (
                <div
                  className="w-full flex justify-center"
                  style={{ maxWidth: `${stageWidth}px` }}
                >
                  <button
                    type="button"
                    onClick={addPage}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-[#D2E5DA] hover:border-[#2D5A43] bg-white/90 hover:bg-[#E8F3ED] text-[#2D5A43] text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm hover:shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#2D5A43]" />
                    <span>Tambah Halaman Baru</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FLOATING TOP-RIGHT SHOW BUTTON (WHEN RIGHT PANEL IS HIDDEN) */}
        {!isTestPlayMode && !isRightPanelOpen && (
          <button
            type="button"
            onClick={handleShowRightPanel}
            className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-full bg-white/95 hover:bg-[#F4F8F5] backdrop-blur-md border border-[#D2E5DA] shadow-lg text-xs font-semibold text-[#1C2E24] flex items-center gap-2 transition cursor-pointer"
            title="Tampilkan Jendela Pengaturan Halaman / Properti Objek"
          >
            {selectedElement ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
                <span>Properti</span>
                <span className="hidden sm:inline text-[#5A7765] font-normal truncate max-w-[110px]">
                  • {selectedElement.name}
                </span>
              </>
            ) : (
              <>
                <Palette className="w-3.5 h-3.5 text-[#2D5A43] shrink-0" />
                <span>Atur Halaman</span>
              </>
            )}
            <PanelRightOpen className="w-3.5 h-3.5 text-[#5A7765] shrink-0" />
          </button>
        )}

        {/* COLLAPSIBLE RIGHT PANEL: PENGATURAN HALAMAN & PROPERTI OBJEK */}
        {!isTestPlayMode && (
          <aside
            className={`absolute top-0 bottom-0 right-0 z-30 w-80 sm:w-[340px] max-w-[90vw] border-l border-[#E2EDE6] bg-white/98 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out text-[#1C2E24] ${
              isRightPanelOpen
                ? 'translate-x-0'
                : 'translate-x-full pointer-events-none'
            }`}
          >
            {!selectedElement ? (
              /* MODE A: PENGATURAN HALAMAN AKTIF & GLOBAL LAYOUT */
              <div className="flex flex-col h-full overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-[#E2EDE6] bg-[#F4F8F5] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {rightPageSubTab === 'global' ? (
                      <Globe className="w-4 h-4 text-[#2D5A43] shrink-0" />
                    ) : (
                      <Palette className="w-4 h-4 text-[#2D5A43] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1C2E24] truncate">
                        {rightPageSubTab === 'global'
                          ? 'Tata Letak & Latar Global'
                          : 'Pengaturan Halaman'}
                      </div>
                      <div className="text-[10px] text-[#5A7765] truncate">
                        Hal {activePageNum}/{sortedPages.length} •{' '}
                        {layoutMode === 'fixed'
                          ? `Fixed (${
                              fixedAlign === 'left'
                                ? 'Kiri'
                                : fixedAlign === 'right'
                                ? 'Kanan'
                                : 'Tengah'
                            })`
                          : 'Fluid'}{' '}
                        • {stageWidth}px
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleHideRightPanel}
                    className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] text-[#5A7765] hover:text-[#1C2E24] border border-[#D2E5DA] transition cursor-pointer shrink-0"
                    title="Sembunyikan Panel Kanan"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>

                {/* Clean 2-Sub-Tab Switcher: Halaman Ini vs Global & Layout */}
                <div className="px-3 py-2 border-b border-[#E2EDE6] bg-[#FBFDFB] shrink-0">
                  <div className="grid grid-cols-2 gap-1 bg-[#F4F8F5] p-1 rounded-xl border border-[#D2E5DA] text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRightPageSubTab('page')}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        rightPageSubTab === 'page'
                          ? 'bg-[#2D5A43] text-white shadow'
                          : 'text-[#5A7765] hover:text-[#1C2E24]'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Halaman Ini</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightPageSubTab('global')}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        rightPageSubTab === 'global'
                          ? 'bg-[#2D5A43] text-white shadow'
                          : 'text-[#5A7765] hover:text-[#1C2E24]'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Global &amp; Layout</span>
                    </button>
                  </div>
                </div>

                {rightPageSubTab === 'page' ? (
                  /* SUB-TAB 1: PENGATURAN HALAMAN AKTIF */
                  currentPage && (
                    <div className="p-3.5 space-y-4 overflow-y-auto flex-1 text-xs">
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#5A7765] uppercase tracking-wider mb-1">
                            Judul Halaman
                          </label>
                          <input
                            type="text"
                            value={currentPage.title}
                            onChange={(e) =>
                              updatePage(currentPage.id, { title: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#5A7765] uppercase tracking-wider mb-1">
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] font-mono focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                          />
                        </div>
                      </div>

                      {/* Sumber Latar Halaman: Ikuti Utama vs Custom */}
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2E24] mb-1.5">
                            Latar Belakang Halaman Ini
                          </label>
                          <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-[#D2E5DA] text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() => {
                                if (!currentPage.useGlobalBackground) {
                                  recordSnapshot();
                                  updatePage(currentPage.id, {
                                    useGlobalBackground: true
                                  });
                                }
                              }}
                              className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                                currentPage.useGlobalBackground
                                  ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                                  : 'text-[#5A7765] hover:text-[#1C2E24]'
                              }`}
                            >
                              Ikuti Utama
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (currentPage.useGlobalBackground) {
                                  recordSnapshot();
                                  updatePage(currentPage.id, {
                                    useGlobalBackground: false
                                  });
                                }
                              }}
                              className={`py-1.5 px-2 rounded-lg transition cursor-pointer ${
                                !currentPage.useGlobalBackground
                                  ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                                  : 'text-[#5A7765] hover:text-[#1C2E24]'
                              }`}
                            >
                              Custom Halaman
                            </button>
                          </div>
                        </div>

                        {currentPage.useGlobalBackground ? (
                          <div className="p-3 rounded-xl bg-white border border-[#D2E5DA] space-y-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-11 h-11 rounded-lg border border-[#D2E5DA] shrink-0 shadow-inner relative overflow-hidden"
                                style={buildBackgroundCSS(globalBackground)}
                              >
                                {globalBackground.overlayOpacity &&
                                globalBackground.overlayOpacity > 0 ? (
                                  <div
                                    className="absolute inset-0 bg-black"
                                    style={{ opacity: globalBackground.overlayOpacity }}
                                  />
                                ) : null}
                              </div>
                              <p className="text-[11px] text-[#5A7765] leading-snug">
                                Halaman ini menyatu mulus tanpa garis potong di atas{' '}
                                <b className="text-[#2D5A43]">Background Utama</b>.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setRightPageSubTab('global')}
                              className="w-full py-1.5 px-2.5 rounded-xl bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-[#2D5A43] text-[11px] font-bold flex items-center justify-between transition cursor-pointer"
                            >
                              <span>Edit Background Utama</span>
                              <span>→</span>
                            </button>
                          </div>
                        ) : (
                          <BackgroundConfigEditor
                            value={currentPage.background}
                            onBeforeTransform={recordSnapshot}
                            onChange={(nextBg) =>
                              updatePage(currentPage.id, { background: nextBg })
                            }
                            onOpenAssetLibrary={() =>
                              setAssetModalTarget({
                                kind: 'page_background',
                                pageId: currentPage.id
                              })
                            }
                            uploadButtonLabel="Pilih / Upload Latar Halaman"
                          />
                        )}
                      </div>

                      {/* Quick Page Actions */}
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-2">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2E24]">
                          Aksi Halaman
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => movePage(currentPage.id, 'up')}
                            disabled={currentPageIndex <= 0}
                            className="py-1.5 px-2 rounded-xl bg-white hover:bg-[#E8F3ED] disabled:opacity-40 text-[#1C2E24] border border-[#D2E5DA] flex items-center justify-center gap-1 transition cursor-pointer font-medium shadow-xs"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-[#2D5A43]" /> Geser Naik
                          </button>
                          <button
                            type="button"
                            onClick={() => movePage(currentPage.id, 'down')}
                            disabled={currentPageIndex >= sortedPages.length - 1}
                            className="py-1.5 px-2 rounded-xl bg-white hover:bg-[#E8F3ED] disabled:opacity-40 text-[#1C2E24] border border-[#D2E5DA] flex items-center justify-center gap-1 transition cursor-pointer font-medium shadow-xs"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-[#2D5A43]" /> Geser Turun
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicatePage(currentPage.id)}
                            className="py-1.5 px-2 rounded-xl bg-white hover:bg-[#E8F3ED] text-[#2D5A43] border border-[#D2E5DA] flex items-center justify-center gap-1 transition cursor-pointer font-medium shadow-xs"
                          >
                            <Copy className="w-3.5 h-3.5" /> Duplikat
                          </button>
                          <button
                            type="button"
                            onClick={() => removePage(currentPage.id)}
                            disabled={project.pages.length <= 1}
                            className="py-1.5 px-2 rounded-xl bg-white hover:bg-rose-50 disabled:opacity-40 text-rose-600 border border-[#D2E5DA] hover:border-rose-300 flex items-center justify-center gap-1 transition cursor-pointer font-medium shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  /* SUB-TAB 2: GLOBAL & LAYOUT (FLUID VS FIXED, ALIGNMENT, GLOBAL BG, OUTER BACKDROP) */
                  <div className="p-3.5 space-y-4 overflow-y-auto flex-1 text-xs">
                    {/* 1. MODE LEBAR GRID (FLUID VS FIXED) + UKURAN + PENEMPATAN */}
                    <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2E24] mb-1.5">
                          Mode Lebar Tampilan
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-xl border border-[#D2E5DA]">
                          <button
                            type="button"
                            onClick={() => {
                              if (layoutMode !== 'fluid') {
                                recordSnapshot();
                                updateGlobalTheme({ layoutMode: 'fluid' });
                              }
                            }}
                            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              layoutMode === 'fluid'
                                ? 'bg-[#2D5A43] text-white shadow-xs'
                                : 'text-[#5A7765] hover:text-[#1C2E24]'
                            }`}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Fluid</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (layoutMode !== 'fixed') {
                                recordSnapshot();
                                updateGlobalTheme({ layoutMode: 'fixed' });
                              }
                            }}
                            className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                              layoutMode === 'fixed'
                                ? 'bg-[#2D5A43] text-white shadow-xs'
                                : 'text-[#5A7765] hover:text-[#1C2E24]'
                            }`}
                          >
                            <LayoutTemplate className="w-3.5 h-3.5" />
                            <span>Fixed</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-[#5A7765] mt-1.5 leading-relaxed">
                          {layoutMode === 'fluid'
                            ? 'Latar meluas 100% penuh mengikuti lebar layar device, sementara posisi elemen tetap rapi di tengah.'
                            : 'Lebar kolom dikunci tetap di semua layar (tablet/desktop), dan otomatis menyesuaikan proporsional di layar HP sempit.'}
                        </p>
                      </div>

                      {/* Ukuran Lebar Grid / Kolom */}
                      <div className="pt-2 border-t border-[#E2EDE6] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-[#1C2E24] font-semibold">
                            {layoutMode === 'fixed'
                              ? 'Lebar Kolom Fixed (px)'
                              : 'Lebar Grid Elemen (px)'}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={320}
                              max={1400}
                              step={20}
                              value={stageWidth}
                              onChange={(e) => {
                                const val = Math.max(
                                  320,
                                  Math.min(1400, parseInt(e.target.value, 10) || 480)
                                );
                                updateGlobalTheme({ stageWidth: val });
                              }}
                              className="w-16 px-1.5 py-0.5 rounded-lg bg-white border border-[#D2E5DA] text-right font-mono text-[11px] text-[#2D5A43] font-bold"
                            />
                            <span className="text-[10px] text-[#5A7765]">px</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { w: 480, label: '480px', Icon: Smartphone },
                            { w: 600, label: '600px', Icon: LayoutTemplate },
                            { w: 800, label: '800px', Icon: Monitor }
                          ].map(({ w, label, Icon }) => (
                            <button
                              key={w}
                              type="button"
                              onClick={() => {
                                recordSnapshot();
                                updateGlobalTheme({ stageWidth: w });
                              }}
                              className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                                stageWidth === w
                                  ? 'bg-[#2D5A43] border-[#2D5A43] text-white shadow-xs'
                                  : 'bg-white hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#5A7765] hover:text-[#1C2E24]'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Penempatan Kolom Fixed: Kiri | Tengah | Kanan */}
                      {layoutMode === 'fixed' && (
                        <div className="pt-2 border-t border-[#E2EDE6] space-y-1.5">
                          <label className="block text-[10px] text-[#1C2E24] font-semibold">
                            Penempatan Kolom Fixed di Layar Lebar
                          </label>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-[#D2E5DA] text-[11px] font-semibold">
                            {(
                              [
                                { align: 'left', label: 'Kiri', Icon: AlignLeft },
                                { align: 'center', label: 'Tengah', Icon: AlignCenter },
                                { align: 'right', label: 'Kanan', Icon: AlignRight }
                              ] as const
                            ).map(({ align, label, Icon }) => (
                              <button
                                key={align}
                                type="button"
                                onClick={() => {
                                  if (fixedAlign !== align) {
                                    recordSnapshot();
                                    updateGlobalTheme({ fixedAlign: align });
                                  }
                                }}
                                className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                                  fixedAlign === align
                                    ? 'bg-[#2D5A43] text-white shadow-xs font-bold'
                                    : 'text-[#5A7765] hover:text-[#1C2E24]'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-[#5A7765]">
                            Kolom menempel rapi ke sisi layar (gaya Split-Screen modern).
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 2. BACKGROUND UTAMA (SEMUA HALAMAN) */}
                    <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2E24]">
                            Background Utama
                          </span>
                          <span className="block text-[10px] text-[#5A7765] mt-0.5">
                            Dipakai oleh{' '}
                            {project.pages.filter((p) => p.useGlobalBackground).length}/
                            {project.pages.length} halaman
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={applyGlobalBackgroundToAllPages}
                          className="px-2 py-1 rounded-xl bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-[#2D5A43] text-[10px] font-bold transition cursor-pointer shrink-0"
                          title="Atur seluruh halaman agar mengikuti Background Utama"
                        >
                          Pakai di Semua Hal
                        </button>
                      </div>

                      <BackgroundConfigEditor
                        value={globalBackground}
                        onBeforeTransform={recordSnapshot}
                        onChange={(nextBg) =>
                          updateGlobalTheme({ globalBackground: nextBg })
                        }
                        onOpenAssetLibrary={() =>
                          setAssetModalTarget({ kind: 'global_background' })
                        }
                        uploadButtonLabel="Pilih / Upload Background Utama"
                      />
                    </div>

                    {/* 3. BACKDROP LUAR (HANYA MUNCUL SAAT FIXED MODE) */}
                    {layoutMode === 'fixed' && (
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#1C2E24]">
                            Backdrop Luar (Layar Lebar)
                          </span>
                          <p className="text-[10px] text-[#5A7765] mt-0.5 leading-relaxed">
                            Diam statis mengisi ruang samping di luar kolom Fixed pada tablet &amp; desktop.
                          </p>
                        </div>

                        <BackgroundConfigEditor
                          value={outerBackdrop}
                          onBeforeTransform={recordSnapshot}
                          onChange={(nextBg) =>
                            updateGlobalTheme({ outerBackdrop: nextBg })
                          }
                          onOpenAssetLibrary={() =>
                            setAssetModalTarget({ kind: 'outer_backdrop' })
                          }
                          uploadButtonLabel="Pilih / Upload Backdrop Luar"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* MODE B: SELECTED ELEMENT INSPECTOR */
              <>
                {/* Selected Element Header Bar + Hide Button */}
                <div className="px-3.5 py-2.5 border-b border-[#E2EDE6] bg-[#F4F8F5] flex items-center justify-between gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedElementId(null)}
                    className="text-xs font-semibold text-[#5A7765] hover:text-[#1C2E24] flex items-center gap-1 cursor-pointer shrink-0"
                    title="Beralih ke Pengaturan Halaman"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#2D5A43]" />
                    <span>Halaman</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        updateElement(selectedElement.id, {
                          hidden: !selectedElement.hidden
                        })
                      }
                      className={`p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] transition cursor-pointer ${
                        selectedElement.hidden ? 'text-rose-500' : 'text-[#5A7765] hover:text-[#1C2E24]'
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
                      className={`p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] transition cursor-pointer ${
                        selectedElement.locked ? 'text-[#2D5A43] font-bold' : 'text-[#5A7765] hover:text-[#1C2E24]'
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
                      className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[#2D5A43] transition cursor-pointer"
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
                      className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-[#D2E5DA] hover:border-rose-300 text-rose-500 transition cursor-pointer"
                      title="Hapus Elemen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-4 bg-[#D2E5DA] mx-0.5" />

                    <button
                      type="button"
                      onClick={handleHideRightPanel}
                      className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[#5A7765] hover:text-[#1C2E24] transition cursor-pointer"
                      title="Sembunyikan Panel Properti"
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inspector Tabs */}
                <div className="flex border-b border-[#E2EDE6] px-3 pt-2 gap-2 text-[11px] font-bold shrink-0 bg-[#FBFDFB]">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('content')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'content'
                        ? 'border-[#2D5A43] text-[#2D5A43]'
                        : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
                    }`}
                  >
                    Transform &amp; Konten
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('animation')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'animation'
                        ? 'border-[#2D5A43] text-[#2D5A43]'
                        : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
                    }`}
                  >
                    Animasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('interaction')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'interaction'
                        ? 'border-[#2D5A43] text-[#2D5A43]'
                        : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
                    }`}
                  >
                    Interaksi
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('template')}
                    className={`pb-2 border-b-2 transition cursor-pointer ${
                      inspectorTab === 'template'
                        ? 'border-[#2D5A43] text-[#2D5A43]'
                        : 'border-transparent text-[#5A7765] hover:text-[#1C2E24]'
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
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1C2E24] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Move className="w-3.5 h-3.5 text-[#2D5A43]" />
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
                            className="text-[10px] text-[#5A7765] hover:text-[#2D5A43] flex items-center gap-1 cursor-pointer font-semibold"
                            title="Reset Rotasi, Skala & Cermin"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset
                          </button>
                        </div>

                        {/* X & Y Coordinates */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono disabled:opacity-50 focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono disabled:opacity-50 focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                              className="py-1 rounded-lg bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] text-[#1C2E24] font-semibold transition cursor-pointer disabled:opacity-40 shadow-xs"
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>

                        {/* SCALE (SKALA) */}
                        <div className="space-y-1 pt-1.5 border-t border-[#E2EDE6]">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-[#1C2E24]">
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
                                className="w-16 px-1.5 py-0.5 rounded-lg bg-white border border-[#D2E5DA] text-right font-mono text-[11px] text-[#2D5A43] font-bold"
                              />
                              <span className="text-[10px] text-[#5A7765]">%</span>
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
                            className="w-full accent-[#2D5A43] cursor-pointer"
                          />
                        </div>

                        {/* ROTATION (ROTASI) */}
                        <div className="space-y-1.5 pt-1.5 border-t border-[#E2EDE6]">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-[#1C2E24]">
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
                                className="w-16 px-1.5 py-0.5 rounded-lg bg-white border border-[#D2E5DA] text-right font-mono text-[11px] text-[#2D5A43] font-bold"
                              />
                              <span className="text-[10px] text-[#5A7765]">°</span>
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
                            className="w-full accent-[#2D5A43] cursor-pointer"
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
                                className={`py-1 rounded-lg border text-[10px] font-mono transition cursor-pointer ${
                                  Math.round(selectedElement.rotation ?? 0) === deg
                                    ? 'bg-[#2D5A43] border-[#2D5A43] text-white shadow-xs'
                                    : 'bg-white hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#5A7765] hover:text-[#1C2E24]'
                                }`}
                              >
                                {deg > 0 ? `+${deg}°` : `${deg}°`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* FLIP & BASE WIDTH/HEIGHT */}
                        <div className="pt-2 border-t border-[#E2EDE6] space-y-2">
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
                              className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                selectedElement.flipX
                                  ? 'bg-[#2D5A43] border-[#2D5A43] text-white shadow-xs'
                                  : 'bg-white hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#1C2E24]'
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
                              className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                selectedElement.flipY
                                  ? 'bg-[#2D5A43] border-[#2D5A43] text-white shadow-xs'
                                  : 'bg-white hover:bg-[#E8F3ED] border-[#D2E5DA] text-[#1C2E24]'
                              }`}
                            >
                              <FlipVertical2 className="w-3.5 h-3.5" /> Flip V
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION B: KONTEN & GAYA TAMPILAN */}
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <span className="font-bold text-[#1C2E24] uppercase tracking-wider text-[11px] block">
                          Konten &amp; Gaya Visual
                        </span>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Nama Layer</label>
                          <input
                            type="text"
                            value={selectedElement.name}
                            onChange={(e) =>
                              updateElement(selectedElement.id, { name: e.target.value })
                            }
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                              className="w-full py-2 px-3 rounded-xl bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-[#2D5A43] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#2D5A43]" /> Upload / Pilih dari Asset Library
                            </button>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">URL Gambar</label>
                              <input
                                type="text"
                                value={selectedElement.mediaUrl || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    mediaUrl: e.target.value,
                                    spriteAsset: undefined
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono text-[11px] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              >
                                <option value="contain">Contain (Utuh / PNG Transparan)</option>
                                <option value="cover">Cover (Crop Penuh Kotak/Lingkaran)</option>
                                <option value="fill">Fill (Rentangkan Sesuai Kotak)</option>
                              </select>
                            </div>

                            {/* Border Radius */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-semibold text-[#5A7765]">Lengkungan Sudut</label>
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
                                      className="px-2 py-0.5 rounded-lg bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] text-[#1C2E24] font-semibold cursor-pointer shadow-xs"
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
                                className="w-full accent-[#2D5A43]"
                              />
                            </div>
                          </div>
                        )}

                        {/* TEXT SPECIFIC CONTROLS */}
                        {selectedElement.type === 'text' && (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Isi Teks</label>
                              <textarea
                                rows={3}
                                value={selectedElement.content || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, {
                                    content: e.target.value
                                  })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] resize-none focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Ketebalan</label>
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Gaya Font</label>
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                >
                                  <option value="sans">Sans Modern</option>
                                  <option value="serif">Serif Klasik</option>
                                  <option value="mono">Monospace</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Rata Teks</label>
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                >
                                  <option value="left">Kiri</option>
                                  <option value="center">Tengah</option>
                                  <option value="right">Kanan</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Warna Teks</label>
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
                                    className="w-7 h-7 rounded-lg bg-transparent border border-[#D2E5DA] cursor-pointer shrink-0"
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
                                    className="w-full px-2 py-1 rounded-lg bg-white border border-[#D2E5DA] text-[#1C2E24] font-mono text-[11px]"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Kotak Latar</label>
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
                                    className="w-7 h-7 rounded-lg bg-transparent border border-[#D2E5DA] cursor-pointer shrink-0"
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
                                    className="flex-1 py-1 px-2 rounded-lg bg-white hover:bg-[#E8F3ED] border border-[#D2E5DA] text-[10px] text-[#1C2E24] font-semibold cursor-pointer shadow-xs transition"
                                  >
                                    {selectedElement.styleOptions?.backgroundColor
                                      ? 'Hapus'
                                      : 'Pakai'}
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
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Teks Tombol</label>
                              <input
                                type="text"
                                value={selectedElement.content || ''}
                                onChange={(e) =>
                                  updateElement(selectedElement.id, { content: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Warna Tombol</label>
                                <input
                                  type="color"
                                  value={
                                    selectedElement.styleOptions?.backgroundColor || '#2D5A43'
                                  }
                                  onChange={(e) =>
                                    updateElement(selectedElement.id, {
                                      styleOptions: {
                                        ...selectedElement.styleOptions,
                                        backgroundColor: e.target.value
                                      }
                                    })
                                  }
                                  className="w-full h-8 rounded-xl bg-transparent border border-[#D2E5DA] cursor-pointer"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Warna Teks</label>
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
                                  className="w-full h-8 rounded-xl bg-transparent border border-[#D2E5DA] cursor-pointer"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* SHARED SHADOW & OPACITY */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2EDE6]">
                          <div>
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Bayangan (Shadow)</label>
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
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                              className="w-full accent-[#2D5A43] mt-2"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION C: LAYER Z-INDEX MANAGER */}
                      <div className="p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-2">
                        <span className="font-bold text-[#1C2E24] flex items-center gap-1.5 text-xs">
                          <Layers className="w-3.5 h-3.5 text-[#2D5A43]" />
                          Urutan Tumpukan Layer (Z-Index: {selectedElement.zIndex})
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => bringElementForward(selectedElement.id)}
                            className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] text-[#1C2E24] border border-[#D2E5DA] cursor-pointer shadow-xs font-medium transition"
                          >
                            Majukan (+1)
                          </button>
                          <button
                            type="button"
                            onClick={() => sendElementBackward(selectedElement.id)}
                            className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] text-[#1C2E24] border border-[#D2E5DA] cursor-pointer shadow-xs font-medium transition"
                          >
                            Mundurkan (-1)
                          </button>
                          <button
                            type="button"
                            onClick={() => bringToFront(selectedElement.id)}
                            className="p-1.5 rounded-xl bg-[#2D5A43] hover:bg-[#234735] text-white font-semibold cursor-pointer shadow-xs transition"
                          >
                            Paling Depan
                          </button>
                          <button
                            type="button"
                            onClick={() => sendToBack(selectedElement.id)}
                            className="p-1.5 rounded-xl bg-white hover:bg-[#E8F3ED] text-[#5A7765] border border-[#D2E5DA] cursor-pointer shadow-xs font-medium transition"
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
                      <div className="space-y-2.5 p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6]">
                        <span className="font-bold text-[#2D5A43] uppercase tracking-wider block text-[11px]">
                          1. Animasi Masuk (Entry)
                        </span>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Tipe Efek Masuk</label>
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                              className="w-full accent-[#2D5A43]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                              className="w-full accent-[#2D5A43]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                          >
                            <option value="ease-out">Ease Out (Halus Alami)</option>
                            <option value="ease-in-out">Ease In-Out</option>
                            <option value="spring">Spring (Pegas)</option>
                            <option value="bounce">Bounce (Memantul)</option>
                            <option value="linear">Linear</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                          >
                            <option value="scroll_reveal">Saat Masuk Layar (Scroll Reveal)</option>
                            <option value="timer">Jeda Waktu Otomatis (Timer)</option>
                            <option value="click_tap">Saat Disentuh / Klik (Click)</option>
                          </select>
                        </div>
                      </div>

                      {/* Seksi Animasi Diam (Idle Loop) */}
                      <div className="space-y-2.5 p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6]">
                        <span className="font-bold text-[#2D5A43] uppercase tracking-wider block text-[11px]">
                          2. Animasi Diam (Idle Loop)
                        </span>

                        <div>
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Tipe Gerakan Idle</label>
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                          <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                            className="w-full accent-[#2D5A43]"
                          />
                        </div>
                      </div>

                      {/* Seksi Animasi Keluar (Exit) */}
                      <div className="space-y-2 p-3 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6]">
                        <span className="font-bold text-rose-600 uppercase tracking-wider block text-[11px]">
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
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                      <div className="p-3.5 rounded-2xl bg-[#F4F8F5] border border-[#E2EDE6] space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-[#1C2E24]">
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
                            className="w-4 h-4 rounded accent-[#2D5A43]"
                          />
                          <span>Aktifkan Aksi Saat Diklik/Sentuh</span>
                        </label>

                        {selectedElement.hasInteraction && selectedElement.interaction && (
                          <div className="space-y-3 pt-3 border-t border-[#E2EDE6]">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Tipe Aksi</label>
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
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">Target Halaman</label>
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                                  <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] resize-none focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                  />
                                </div>
                              </>
                            )}

                            {selectedElement.interaction.type === 'info' && (
                              <>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                    className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                                  />
                                </div>
                              </>
                            )}

                            {['image', 'video'].includes(selectedElement.interaction.type) && (
                              <div className="space-y-2">
                                <label className="block text-[10px] font-semibold text-[#5A7765] mb-1">
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
                                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-xs text-[#1C2E24] focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
                                    className="w-full py-1.5 px-2.5 rounded-xl bg-[#E8F3ED] hover:bg-[#D2E5DA] border border-[#D2E5DA] text-[#2D5A43] font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A43]" /> Pilih Foto Lightbox dari Library
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: TEMPLATE FORM FLAGS */}
                  {inspectorTab === 'template' && (
                    <div className="space-y-4 bg-[#F4F8F5] p-3.5 rounded-2xl border border-[#E2EDE6]">
                      <span className="font-bold text-[#2D5A43] uppercase tracking-wider block text-[11px]">
                        Pengaturan Mode Template
                      </span>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1C2E24]">
                          <input
                            type="checkbox"
                            checked={selectedElement.editable_appearance}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                editable_appearance: e.target.checked
                              })
                            }
                            className="w-4 h-4 rounded accent-[#2D5A43]"
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] text-xs focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
                          />
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#E2EDE6]">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1C2E24]">
                          <input
                            type="checkbox"
                            checked={selectedElement.editable_content}
                            onChange={(e) =>
                              updateElement(selectedElement.id, {
                                editable_content: e.target.checked
                              })
                            }
                            className="w-4 h-4 rounded accent-[#2D5A43]"
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
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D2E5DA] text-[#1C2E24] text-xs focus:outline-none focus:border-[#2D5A43] focus:ring-1 focus:ring-[#2D5A43]"
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
            : assetModalTarget?.kind === 'global_background'
            ? 'Pilih atau Upload Gambar Background Utama'
            : assetModalTarget?.kind === 'outer_backdrop'
            ? 'Pilih atau Upload Gambar Backdrop Luar'
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
          } else if (assetModalTarget.kind === 'global_background') {
            updateGlobalTheme({
              globalBackground: {
                ...globalBackground,
                type: 'image',
                value: sprite.frames[0]
              }
            });
          } else if (assetModalTarget.kind === 'outer_backdrop') {
            updateGlobalTheme({
              outerBackdrop: {
                ...outerBackdrop,
                type: 'image',
                value: sprite.frames[0]
              }
            });
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
