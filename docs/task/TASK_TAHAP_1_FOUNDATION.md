# Task Breakdown: Tahap 1 — Refactoring Fondasi & Setup Theme Registry
**Status:** READY TO EXECUTE  
**Prioritas:** P0 (Kritis)

---

## 📋 Checklist Eksekusi Tahap 1

### 1. Modularisasi Tipe Data (`src/types/`)
- [ ] **Task 1.1: Pembuatan `src/types/base.ts`**
  - Definisikan `GameThemeType`: `'platformer' | 'vertical_scroll'`.
  - Pindahkan tipe-tipe universal dari `platformer.ts` ke `base.ts`:
    - `BaseProject`: field bersama (`slug`, `title`, `subtitle`, `theme_type`, `is_template_enabled`, `musicUrl`, `rsvps`).
    - `RSVPRecord`, `SpriteAsset`, `SpriteType`, `SoundAsset`, `SoundEventType`.
- [ ] **Task 1.2: Refactoring `src/types/platformer.ts`**
  - Ubah `PlatformerProject` menjadi `interface PlatformerProject extends BaseProject` dengan `theme_type: 'platformer'`.
  - Pastikan seluruh konfigurasi `player`, `PlayerColliderConfig`, `world`, `entities`, dan `audio` tetap lengkap.
- [ ] **Task 1.3: Pembuatan `src/types/index.ts`**
  - Ekspor union polymorphic: `type AnyGemUndangProject = PlatformerProject | VerticalScrollProject`.
  - Re-ekspor seluruh tipe dari `base.ts`, `platformer.ts`, dan `verticalScroll.ts`.

---

### 2. Pembangunan Theme Registry Hub (`src/themes/`)
- [ ] **Task 2.1: Pembuatan `src/themes/types.ts`**
  - Buat interface generic `ThemeDefinition<T extends BaseProject>`:
    - `id`: `GameThemeType`
    - `name`: string nama tema
    - `description`: string deskripsi singkat
    - `badge`: label badge (misal: "Game 2D", "Web Interaktif")
    - `icon`: ikon Lucide
    - `defaultProject(slug, title)`: generator default seed
    - `EditorComponent`: Komponen UI Editor
    - `TemplateComponent`: Komponen UI Form Template
    - `RuntimeComponent`: Komponen Player Tamu
- [ ] **Task 2.2: Isolasi Tema Platformer ke `src/themes/platformer/`**
  - Pindahkan/hubungkan komponen platformer:
    - `PlatformerEditor.tsx`
    - `PlatformerTemplate.tsx`
    - `PlatformerEngine.tsx`
    - `defaultProject.ts`
  - Buat `PlatformerThemeDefinition` di `src/themes/platformer/index.ts`.
- [ ] **Task 2.3: Pembuatan `src/themes/registry.ts`**
  - Buat dictionary `THEME_REGISTRY: Record<GameThemeType, ThemeDefinition>`.
  - Implementasikan `getThemeDefinition(themeType?: string): ThemeDefinition` dengan fallback aman ke platformer jika tema tidak dikenal / undefined.

---

### 3. Penyesuaian Data Layer & Prisma (`src/lib/projectStorage.ts`)
- [ ] **Task 3.1: Parsing Data Polymorphic di `toProject`**
  - Baca `(row.data as any)?.theme_type || 'platformer'`.
  - Pastikan project platformer eksisting di database terbaca normal tanpa error casting.
- [ ] **Task 3.2: Dukungan `theme_type` pada `createNewProject`**
  - Tambahkan opsi `theme_type?: GameThemeType` pada parameter input.
  - Jika membuat dari nol, panggil `THEME_REGISTRY[theme_type].defaultProject(input.slug, input.title)`.
  - Simpan atribut `theme_type` ke dalam kolom `data` (Json).
- [ ] **Task 3.3: Pembaruan `ProjectSummary`**
  - Tambahkan properti `theme_type: GameThemeType` pada `ProjectSummary` agar dashboard dapat menampilkan informasi tema.

---

### 4. Pembaruan Dashboard & Routing (`src/app/`)
- [ ] **Task 4.1: Theme Picker di Dashboard (`src/app/page.tsx`)**
  - Tambahkan kartu seleksi tema pada modal/seksi "Buat Projek Baru":
    - Kartu 1: 2D Platformer Quest
    - Kartu 2: Vertical Scroll Reveal
  - Tampilkan badge jenis tema pada daftar projek di tab "Projek Saya" dan "Template".
- [ ] **Task 4.2: Dynamic Routing Switcher di Editor (`src/app/editor/[slug]/page.tsx`)**
  - Ganti hardcoded editor platformer dengan pemanggilan dinamis:
    ```tsx
    const theme = getThemeDefinition(project.theme_type);
    const EditorUI = theme.EditorComponent;
    return <EditorUI project={project} onSave={saveProject} />;
    ```
- [ ] **Task 4.3: Dynamic Routing Switcher di Template (`src/app/template/[slug]/page.tsx`)**
  - Ganti hardcoded template platformer dengan pemanggilan dinamis:
    ```tsx
    const theme = getThemeDefinition(project.theme_type);
    const TemplateUI = theme.TemplateComponent;
    return <TemplateUI project={project} onSave={saveProject} />;
    ```
- [ ] **Task 4.4: Dynamic Routing Switcher di View (`src/app/view/[slug]/page.tsx`)**
  - Ganti hardcoded player platformer dengan pemanggilan dinamis:
    ```tsx
    const theme = getThemeDefinition(project.theme_type);
    const RuntimeUI = theme.RuntimeComponent;
    return <RuntimeUI project={project} mode="play" guestName={guestName} />;
    ```

---

## 🧪 Kriteria Keberhasilan (Acceptance Criteria)
1. Seluruh project platformer lama di database tetap dapat dibuka dan dimainkan tanpa error.
2. Pembuatan project platformer baru melalui dashboard berjalan normal.
3. Struktur registry siap menerima registrasi tema kedua (Vertical Scroll Reveal).
4. `npm run build` lulus tanpa error TypeScript.
