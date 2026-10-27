import { PlatformerProject } from '@/types/platformer';
import {
  presetGroom,
  priestSprite,
  billboardSprite,
  chestSprite,
  signpostSprite,
  weddingArchSprite,
  defaultSkyLayer,
  defaultMountainLayer,
  defaultCloudLayer,
  defaultTreeLayer
} from './assetLibrary';

// Seed demo project
export const DEFAULT_DEMO_PROJECT: PlatformerProject = {
  slug: 'wedding-adventure',
  title: 'The Wedding Quest of Dimas & Sarah',
  subtitle: 'Undangan Pernikahan Interaktif',
  is_template_enabled: true,
  player: {
    startX: 100,
    startY: 400,
    width: 44,
    height: 60,
    collider: {
      width: 32,
      height: 54,
      offsetX: 6,
      offsetY: 6
    },
    canJump: true,
    jumpForce: 13,
    speed: 4,
    idleSprite: presetGroom.idle,
    runSprite: presetGroom.run,
    editable_appearance: true,
    editableLabel: 'Karakter Pemain (Avatar Tamu)'
  },
  world: {
    groundMode: 'endless',
    worldWidth: 3200,
    groundY: 460,
    platforms: [
      { id: 'plat-1', x: 650, y: 360, width: 140, height: 24, tileColor: '#4ade80' },
      { id: 'plat-2', x: 820, y: 280, width: 160, height: 24, tileColor: '#4ade80' },
      { id: 'plat-3', x: 1250, y: 350, width: 160, height: 24, tileColor: '#4ade80' },
      { id: 'plat-4', x: 1750, y: 340, width: 180, height: 24, tileColor: '#4ade80' },
      { id: 'plat-5', x: 2350, y: 360, width: 140, height: 24, tileColor: '#4ade80' }
    ],
    parallaxLayers: [
      {
        id: 'layer-sky',
        name: 'Langit Sunset',
        imageUrl: defaultSkyLayer,
        speedRatio: 0.05,
        yOffset: 0,
        editable_appearance: true,
        editableLabel: 'Latar Belakang Langit'
      },
      {
        id: 'layer-mountain',
        name: 'Pegunungan Ungu',
        imageUrl: defaultMountainLayer,
        speedRatio: 0.2,
        yOffset: 60,
        editable_appearance: false
      },
      {
        id: 'layer-cloud',
        name: 'Awan Berarak',
        imageUrl: defaultCloudLayer,
        speedRatio: 0.35,
        yOffset: 20,
        editable_appearance: false
      },
      {
        id: 'layer-trees',
        name: 'Pohon & Bukit Depan',
        imageUrl: defaultTreeLayer,
        speedRatio: 0.65,
        yOffset: 70,
        editable_appearance: false
      }
    ]
  },
  entities: [
    {
      id: 'ent-penghulu',
      name: 'Penghulu Pernikahan',
      type: 'npc',
      x: 350,
      y: 396,
      width: 48,
      height: 64,
      sprite: priestSprite,
      hasInteraction: true,
      interaction: {
        type: 'info',
        title: 'Selamat Datang!',
        content: 'Halo teman! Kami mengundangmu untuk merayakan hari bahagia Dimas & Sarah. Silakan jelajahi perjalanan cinta kami dengan berjalan ke arah kanan!'
      },
      editable_appearance: true,
      appearanceLabel: 'Kostum NPC Penghulu',
      editable_content: true,
      contentLabel: 'Teks Sambutan Awal'
    },
    {
      id: 'ent-billboard',
      name: 'Layar Bioskop Teaser',
      type: 'obstacle',
      x: 870,
      y: 216,
      width: 64,
      height: 64,
      sprite: billboardSprite,
      hasInteraction: true,
      interaction: {
        type: 'video',
        title: 'Video Teaser Prewedding',
        content: 'Tonton video perjalanan kisah cinta kami yang penuh suka dan tawa.',
        mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      },
      editable_appearance: true,
      appearanceLabel: 'Tampilan Layar Video',
      editable_content: true,
      contentLabel: 'Link Video Prewedding'
    },
    {
      id: 'ent-chest',
      name: 'Peti Galeri Bromo',
      type: 'obstacle',
      x: 1300,
      y: 412,
      width: 48,
      height: 48,
      sprite: chestSprite,
      hasInteraction: true,
      interaction: {
        type: 'image',
        title: 'Galeri Foto Prewedding',
        content: 'Momen berharga saat kami menikmati matahari terbit di atas lautan pasir Bromo.',
        mediaUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'
      },
      editable_appearance: false,
      editable_content: true,
      contentLabel: 'Foto Kenangan Bromo'
    },
    {
      id: 'ent-signpost',
      name: 'Papan Arah Lokasi',
      type: 'decoration',
      x: 2050,
      y: 412,
      width: 48,
      height: 48,
      sprite: signpostSprite,
      hasInteraction: true,
      interaction: {
        type: 'info',
        title: 'Waktu & Tempat Resepsi',
        content: 'Sabtu, 28 November 2026\nAkad Nikah: 08:00 WIB\nResepsi: 11:00 - 14:00 WIB\nLokasi: Grand Ballroom Mulia Resort & Hotel',
        actionButtonText: 'Buka di Google Maps',
        actionUrl: 'https://maps.google.com'
      },
      editable_appearance: false,
      editable_content: true,
      contentLabel: 'Detail Tanggal & Lokasi Resepsi'
    },
    {
      id: 'ent-arch',
      name: 'Gapura Pelaminan & RSVP',
      type: 'decoration',
      x: 2800,
      y: 364,
      width: 80,
      height: 96,
      sprite: weddingArchSprite,
      hasInteraction: true,
      interaction: {
        type: 'rsvp',
        title: 'Konfirmasi Kehadiran (RSVP)',
        content: 'Kehadiran dan doa restu Anda adalah kado terindah bagi kami. Mohon isi konfirmasi kehadiran Anda di bawah ini.'
      },
      editable_appearance: true,
      appearanceLabel: 'Dekorasi Gapura Akhir',
      editable_content: true,
      contentLabel: 'Pesan Konfirmasi Kehadiran'
    }
  ],
  rsvps: [
    {
      id: 'rsvp-1',
      guestName: 'Budi Santoso',
      attendance: 'hadir',
      pax: 2,
      message: 'Selamat Dimas & Sarah! Semoga langgeng dan bahagia selalu!',
      createdAt: '2026-10-21 14:20'
    }
  ]
};

// Check if slug is valid (alphanumeric & hyphens only)
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
