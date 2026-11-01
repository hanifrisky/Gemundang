import fs from 'fs/promises';
import path from 'path';
import { prisma } from './prisma';
import type { AnyGemUndangProject } from '@/types';

// Basis direktori penyimpanan file (relative terhadap root aplikasi)
const BASE_STORAGE_DIR = path.join(process.cwd(), 'storage', 'projects');

export interface ProjectVersionItem {
  id: number;
  versionNumber: number;
  name: string;
  filePath: string;
  fileSize: number;
  isLocked: boolean;
  createdAt: string;
}

/**
 * Memastikan direktori terisolasi untuk project uuid tertentu tersedia
 */
export async function ensureProjectDirectories(projectUuid: string): Promise<{
  projectDir: string;
  versionsDir: string;
  tmpDir: string;
}> {
  const projectDir = path.join(BASE_STORAGE_DIR, projectUuid);
  const versionsDir = path.join(projectDir, 'versions');
  const tmpDir = path.join(projectDir, 'tmp');

  await fs.mkdir(versionsDir, { recursive: true });
  await fs.mkdir(tmpDir, { recursive: true });

  return { projectDir, versionsDir, tmpDir };
}

/**
 * Menulis file secara atomik menggunakan file temporary
 */
export async function writeAtomicJsonFile(targetPath: string, data: any): Promise<number> {
  const targetDir = path.dirname(targetPath);
  await fs.mkdir(targetDir, { recursive: true });

  const tempPath = path.join(
    targetDir,
    `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`
  );

  const jsonString = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, jsonString, 'utf-8');
  await fs.rename(tempPath, targetPath);

  const stat = await fs.stat(targetPath);
  return stat.size;
}

function resolveSafeStoragePath(inputPath: string): string {
  if (path.isAbsolute(inputPath)) return inputPath;
  // Pastikan path selalu terarah ke dalam subfolder storage
  const normalized = inputPath.replace(/^storage[\\/]/, '');
  return path.join(process.cwd(), 'storage', normalized);
}

/**
 * Membaca file JSON payload projek
 */
export async function readProjectJsonFile<T = AnyGemUndangProject>(filePath: string): Promise<T | null> {
  try {
    const fullPath = resolveSafeStoragePath(filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Gagal membaca file projek [${filePath}]:`, err);
    return null;
  }
}

/**
 * Menyimpan snapshot versi baru ke folder versions/{n}_{timestamp}.json
 */
export async function createVersionSnapshot(
  projectId: number,
  projectUuid: string,
  payload: AnyGemUndangProject,
  versionName: string,
  isLocked = false
): Promise<ProjectVersionItem | null> {
  try {
    const { versionsDir } = await ensureProjectDirectories(projectUuid);

    // Dapatkan nomor versi berikutnya
    const lastVersion = await prisma.projectVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true }
    });

    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;
    const versionFileName = `v${nextVersionNumber}_${Date.now()}.json`;
    const targetFilePath = path.join(versionsDir, versionFileName);

    // Tulis snapshot secara atomik
    const fileSize = await writeAtomicJsonFile(targetFilePath, payload);

    // Simpan metadata ke MySQL
    const relativePath = path.relative(process.cwd(), targetFilePath).replace(/\\/g, '/');
    const label = versionName.trim() || `Versi ${nextVersionNumber}`;

    const record = await prisma.projectVersion.create({
      data: {
        projectId,
        versionNumber: nextVersionNumber,
        name: label,
        filePath: relativePath,
        fileSize,
        isLocked
      }
    });

    // Update versi aktif di Project
    await prisma.project.update({
      where: { id: projectId },
      data: { currentVersion: nextVersionNumber }
    });

    // Jalankan pruning rotasi (maks 10 versi tidak terkunci)
    await pruneUnlockedVersions(projectId, projectUuid);

    return {
      id: record.id,
      versionNumber: record.versionNumber,
      name: record.name,
      filePath: record.filePath,
      fileSize: record.fileSize,
      isLocked: record.isLocked,
      createdAt: record.createdAt.toLocaleString('id-ID')
    };
  } catch (err) {
    console.error('Gagal membuat snapshot versi:', err);
    return null;
  }
}

/**
 * Pruning versi tidak terkunci jika melebihi kuota maksimal 10.
 * Versi yang isLocked === true SELALU AMAN dan TIDAK PERNAH DIHAPUS.
 */
export async function pruneUnlockedVersions(projectId: number, projectUuid: string, maxUnlockedQuota = 10): Promise<void> {
  try {
    const unlocked = await prisma.projectVersion.findMany({
      where: { projectId, isLocked: false },
      orderBy: { versionNumber: 'desc' }
    });

    if (unlocked.length > maxUnlockedQuota) {
      const versionsToDelete = unlocked.slice(maxUnlockedQuota);

      for (const v of versionsToDelete) {
        // Hapus file fisik
        try {
          const fullPath = resolveSafeStoragePath(v.filePath);
          await fs.unlink(fullPath);
        } catch (e) {
          // Abaikan jika file sudah tidak ada
        }
      }

      // Hapus dari database
      await prisma.projectVersion.deleteMany({
        where: { id: { in: versionsToDelete.map(x => x.id) } }
      });
    }
  } catch (err) {
    console.error('Gagal melakukan pruning versi:', err);
  }
}

/**
 * Menghapus seluruh folder storage sebuah projek
 */
export async function deleteProjectStorageFolder(projectUuid: string): Promise<void> {
  try {
    const projectDir = path.join(BASE_STORAGE_DIR, projectUuid);
    await fs.rm(projectDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`Gagal menghapus folder storage projek [${projectUuid}]:`, err);
  }
}
