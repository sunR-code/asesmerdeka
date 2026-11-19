import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

class LocalStorageMock {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(String(key), String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as unknown as { localStorage: LocalStorageMock }).localStorage = new LocalStorageMock();
}
if (typeof (globalThis as unknown as { addEventListener?: unknown }).addEventListener !== 'function') {
  (globalThis as unknown as { addEventListener: () => void }).addEventListener = () => {};
}
if (typeof (globalThis as unknown as { removeEventListener?: unknown }).removeEventListener !== 'function') {
  (globalThis as unknown as { removeEventListener: () => void }).removeEventListener = () => {};
}
if (typeof (globalThis as unknown as { window?: unknown }).window === 'undefined') {
  (globalThis as unknown as { window: unknown }).window = globalThis;
}

import { LicenseModal } from '../../components/LicenseModal';
import { TopHeader } from '../../components/layout/TopHeader';
import { HelpFeedbackModal } from '../../components/HelpFeedbackModal';
import { TeacherGuideView } from '../../components/TeacherGuideView';
import {
  HIDDEN_AI_PRO_PLAN_IDS,
  ONE_TIME_PLANS,
  PUBLIC_VISIBLE_PLAN_IDS,
  buildAdminWhatsAppPurchaseUrl,
  buildWhatsAppPurchaseMessage,
  getAdminWhatsAppNumber,
  normalizeWhatsAppNumber,
} from '../paymentGateway';
import { isLicensed, getTierDisplayName } from '../licenseManager';
import {
  GUIDE_QUICK_INTENTS,
  TEACHER_GUIDE_CHAPTERS,
} from '../../data/teacherGuideCatalog';
import type { UserQuota } from '../../types/assessment';
import type { SchoolProfile } from '../schoolProfileStorage';

function makeQuota(overrides: Partial<UserQuota> = {}): UserQuota {
  return {
    tier: 'free',
    remainingCredits: 0,
    maxCredits: 0,
    deviceId: 'DEV-TASK93-TEST',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<SchoolProfile> = {}): SchoolProfile {
  return {
    schoolId: 'sch-task93-test',
    instansiDinas: 'DINAS PENDIDIKAN TEST',
    namaSekolah: 'SDN Uji Pra-Rilis 9.3',
    alamatSekolah: 'Jl. Merdeka No. 93',
    namaGuru: 'Ibu Sari, S.Pd.',
    nipGuru: '198801012015012001',
    namaKepalaSekolah: 'Bapak Hendra, M.Pd.',
    nipKepalaSekolah: '197501012000011001',
    kotaSekolah: 'Bogor',
    jenjang: 'SD/MI',
    kelasUtama: '4',
    rombelAktif: 'IV A',
    daftarRombel: ['IV A'],
    mataPelajaranUtama: 'Seni Musik',
    semester: '1 (Ganjil)',
    tahunAjaran: '2026/2027',
    tampilkanTandaTangan: true,
    pakaiFormatKopSekolah: true,
    ...overrides,
  };
}

describe('Task 9.3 — Pre-Launch UX Refinement (License Packages, WhatsApp Purchase & Teacher Guide)', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Bagian A: hanya 2 paket utama tampil di UI publik, 2 paket AI PRO disembunyikan, dan definisi internal tetap utuh', () => {
    expect(PUBLIC_VISIBLE_PLAN_IDS).toEqual(['pro_individu', 'pro_sekolah']);
    expect(HIDDEN_AI_PRO_PLAN_IDS).toEqual(['pro_ai', 'sekolah_pro']);

    const html = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
      })
    );

    // Dua paket utama tetap tampil dengan harga dan fitur asli
    expect(html).toContain('Lisensi Guru Mandiri');
    expect(html).toContain('Rp 99.000');
    expect(html).toContain('Rp 249.000');
    expect(html).toContain('1 Guru Mandiri');
    expect(html).toContain('Lisensi Kolektif Sekolah');
    expect(html).toContain('Rp 749.000');
    expect(html).toContain('Rp 1.499.000');
    expect(html).toContain('25 Guru');
    expect(html).toContain('SPJ Dana BOS');

    // Dua paket AI PRO tidak tampil di UI publik
    expect(html).not.toContain('Lisensi Guru Mandiri PRO');
    expect(html).not.toContain('Rp 199.000');
    expect(html).not.toContain('Lisensi Kolektif Sekolah PRO');
    expect(html).not.toContain('Gemini Pro Enterprise');

    // Backend / kompatibilitas lisensi terdahulu tetap dipertahankan
    expect(ONE_TIME_PLANS.pro_ai.price).toBe(199000);
    expect(ONE_TIME_PLANS.sekolah_pro.price).toBe(1499000);
    expect(isLicensed('pro')).toBe(true);
    expect(isLicensed('sekolah_pro')).toBe(true);
    expect(getTierDisplayName('pro')).toBeTruthy();
    expect(getTierDisplayName('sekolah_pro')).toBeTruthy();
  });

  it('Bagian B: alur pembelian WhatsApp terpusat, pesan dinamis per paket, modal responsif, & aman jika nomor kosong', () => {
    // Normalisasi nomor telepon ke format internasional 628...
    expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890');
    expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890');
    expect(normalizeWhatsAppNumber('81234567890')).toBe('6281234567890');
    expect(normalizeWhatsAppNumber('')).toBe('');
    expect(normalizeWhatsAppNumber('123')).toBe('');

    const configuredNumber = getAdminWhatsAppNumber();
    expect(configuredNumber).toMatch(/^628\d{7,13}$/);

    // Safe failure bila konfigurasi kosong (Bagian B4)
    expect(buildAdminWhatsAppPurchaseUrl('pro_individu', '')).toBe('');

    // Pesan spesifik per paket
    const msgIndividu = buildWhatsAppPurchaseMessage('pro_individu');
    expect(msgIndividu).toContain('Lisensi Guru Mandiri');
    expect(msgIndividu).toContain('Rp 99.000');

    const msgSekolah = buildWhatsAppPurchaseMessage('pro_sekolah');
    expect(msgSekolah).toContain('Lisensi Kolektif Sekolah');
    expect(msgSekolah).toContain('Rp 749.000');
    expect(msgSekolah.toLowerCase()).toContain('jumlah guru');
    expect(msgSekolah.toLowerCase()).toContain('aktivasi lisensi kolektif');

    const urlIndividu = buildAdminWhatsAppPurchaseUrl('pro_individu');
    const urlSekolah = buildAdminWhatsAppPurchaseUrl('pro_sekolah');
    expect(urlIndividu).toMatch(/^https:\/\/wa\.me\/628\d+\?text=/);
    expect(urlSekolah).toMatch(/^https:\/\/wa\.me\/628\d+\?text=/);
    expect(decodeURIComponent(urlIndividu.split('text=')[1])).toContain('Lisensi Guru Mandiri');
    expect(decodeURIComponent(urlSekolah.split('text=')[1])).toContain('Lisensi Kolektif Sekolah');

    // Render modal pemberitahuan pembelian online belum tersedia untuk paket Sekolah
    const modalHtml = renderToStaticMarkup(
      React.createElement(LicenseModal, {
        isOpen: true,
        onClose: () => {},
        quota: makeQuota(),
        onUpdateQuota: () => {},
        initialWhatsAppModalPlanId: 'pro_sekolah',
      })
    );
    expect(modalHtml).toContain('Pembelian Online Sementara Belum Tersedia');
    expect(modalHtml).toContain('Hubungi Admin via WhatsApp');
    expect(modalHtml).toContain('Kembali / Tutup');
    expect(modalHtml).toContain('Lisensi Kolektif Sekolah');
    expect(modalHtml).toContain('Hingga 25 Guru');
    expect(modalHtml).not.toContain('via Payment Gateway');
    expect(modalHtml).not.toContain('@admin');
  });

  it('Bagian C: tombol Panduan langsung di header berdekatan dengan Bantuan, Bantuan tetap terpisah', () => {
    const headerHtml = renderToStaticMarkup(
      React.createElement(TopHeader, {
        pageSection: 'Perangkat Semester',
        pageTitle: 'Peta materi & TP',
        schoolProfile: makeProfile(),
        onOpenSchoolModal: () => {},
        onOpenLicenseModal: () => {},
        onOpenGuideModal: () => {},
        onOpenHelpModal: () => {},
        onToggleMobileSidebar: () => {},
      })
    );

    expect(headerHtml).toContain('header-pill-guide');
    expect(headerHtml).toContain('>Panduan<');
    expect(headerHtml).toContain('header-pill-help');
    expect(headerHtml).toContain('>Bantuan<');
    expect(headerHtml.indexOf('header-pill-guide')).toBeLessThan(headerHtml.indexOf('header-pill-help'));

    // HelpFeedbackModal tetap membuka Pusat Bantuan & Lapor Kendala terpisah
    const helpHtml = renderToStaticMarkup(
      React.createElement(HelpFeedbackModal, {
        isOpen: true,
        onClose: () => {},
        onOpenGuide: () => {},
        schoolProfile: makeProfile(),
        deviceId: 'DEV-TASK93',
        isPro: false,
      })
    );
    expect(helpHtml).toContain('Pusat Bantuan &amp; Lapor Kendala');
    expect(helpHtml).toContain('Buka Buku Panduan');
    expect(helpHtml).toContain('Kirim Laporan Kendala');
  });

  it('Bagian D–G: Panduan Guru mencakup 8 Bagian sistematis, 7 struktur konsisten, Saya ingin, & public/panduan.html sinkron', () => {
    expect(TEACHER_GUIDE_CHAPTERS).toHaveLength(8);
    expect(GUIDE_QUICK_INTENTS.length).toBeGreaterThanOrEqual(8);

    const chapterIds = new Set(TEACHER_GUIDE_CHAPTERS.map((c) => c.id));
    for (const intent of GUIDE_QUICK_INTENTS) {
      expect(chapterIds.has(intent.targetChapterId)).toBe(true);
      expect(intent.whereToClick.length).toBeGreaterThan(5);
    }

    for (const chapter of TEACHER_GUIDE_CHAPTERS) {
      expect(chapter.fullTitle).toContain(`BAGIAN ${chapter.number}`);
      expect(chapter.tujuan.length).toBeGreaterThan(20);
      expect(chapter.kapanDigunakan.length).toBeGreaterThan(20);
      expect(chapter.persiapan.length).toBeGreaterThan(0);
      expect(chapter.langkahLangkah.length).toBeGreaterThanOrEqual(4);
      expect(chapter.hasilDiharapkan.length).toBeGreaterThan(0);
      expect(chapter.kesalahanUmum.length).toBeGreaterThanOrEqual(2);
      expect(chapter.langkahSelanjutnya.text.length).toBeGreaterThan(10);
    }

    const guideHtml = renderToStaticMarkup(
      React.createElement(TeacherGuideView, {
        onBackToApp: () => {},
        initialChapterId: 'bagian-6',
      })
    );
    expect(guideHtml).toContain('Kembali ke Aplikasi');
    expect(guideHtml).toContain('Cetak / Simpan PDF');
    expect(guideHtml).toContain('Saya ingin...');
    expect(guideHtml).toContain('1. Tujuan');
    expect(guideHtml).toContain('2. Kapan digunakan?');
    expect(guideHtml).toContain('3. Persiapan');
    expect(guideHtml).toContain('4. Langkah-langkah');
    expect(guideHtml).toContain('5. Hasil yang diharapkan');
    expect(guideHtml).toContain('6. Kesalahan umum');
    expect(guideHtml).toContain('7. Langkah selanjutnya');
    expect(guideHtml).toContain('[CONTOH DATA SIMULASI');
    expect(guideHtml).toContain('Belum Dinilai');
    expect(guideHtml).toContain('Perlu Bimbingan');
    expect(guideHtml).toContain('Bagian Sebelumnya');
    expect(guideHtml).toContain('Bagian Selanjutnya');

    const staticPanduanHtml = fs.readFileSync(
      path.resolve(process.cwd(), 'public', 'panduan.html'),
      'utf8'
    );
    for (let i = 1; i <= 8; i++) {
      expect(staticPanduanHtml).toContain(`BAGIAN ${i}`);
    }
    expect(staticPanduanHtml).toContain('Saya ingin...');
    expect(staticPanduanHtml).toContain('Cetak / Simpan PDF');
    expect(staticPanduanHtml).toContain('Kembali ke Aplikasi');
    expect(staticPanduanHtml).toContain('Auto-Deskripsi e-Rapor');
    expect(staticPanduanHtml).toContain('Paket Siap Supervisi');
  });
});
