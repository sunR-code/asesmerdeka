import { activateLicense, deductQuota, getUserQuota, refundQuota, isLicensed } from './licenseManager';
import type { UserQuota } from '../types/assessment';

export { deductQuota, refundQuota };

export function getQuotaRemaining(): number {
  const quota = getUserQuota();
  if (isLicensed(quota.tier)) return Infinity;
  return quota.remainingCredits;
}

export type OneTimePlanId = 'pro_individu' | 'pro_sekolah' | 'pro_ai' | 'sekolah_pro';

export type PaymentMethodId =
  | 'qris'
  | 'va_bri'
  | 'va_mandiri'
  | 'va_bca'
  | 'va_bni'
  | 'ewallet_dana_gopay';

export interface OneTimePlan {
  id: OneTimePlanId;
  name: string;
  badge: string;
  originalPrice: number;
  price: number;
  priceFormatted: string;
  originalPriceFormatted: string;
  subtitle: string;
  targetAudience: string;
  features: string[];
  paymentLinkEnv?: string;
  isComingSoon?: boolean;
}

export interface PaymentMethodOption {
  id: PaymentMethodId;
  name: string;
  category: 'QRIS Instan' | 'Virtual Account Bank' | 'E-Wallet';
  description: string;
  feeText: string;
  vaPrefix?: string;
}

export interface PaymentInvoiceSession {
  invoiceId: string;
  planId: OneTimePlanId;
  planName: string;
  methodId: PaymentMethodId;
  methodName: string;
  buyerName: string;
  buyerEmail: string;
  deviceId: string;
  baseAmount: number;
  uniqueCode: number;
  totalAmount: number;
  virtualAccountNumber?: string;
  qrisPayload?: string;
  createdAt: string;
  expiresAt: string;
  externalCheckoutUrl?: string;
}

const STORAGE_KEY_MAYAR_INDIVIDU = 'asesmerdeka_mayar_link_individu';
const STORAGE_KEY_MAYAR_SEKOLAH = 'asesmerdeka_mayar_link_sekolah';

export function getMayarPaymentLink(planId: OneTimePlanId): string {
  try {
    const localKey =
      planId === 'pro_individu'
        ? localStorage.getItem(STORAGE_KEY_MAYAR_INDIVIDU)
        : localStorage.getItem(STORAGE_KEY_MAYAR_SEKOLAH);
    if (localKey && localKey.trim().startsWith('http')) {
      return localKey.trim();
    }
  } catch {
    // ignore
  }

  const envUrl =
    planId === 'pro_individu'
      ? (import.meta as any).env?.VITE_PAYMENT_LINK_INDIVIDU
      : (import.meta as any).env?.VITE_PAYMENT_LINK_SEKOLAH;

  return typeof envUrl === 'string' && envUrl.trim().startsWith('http') ? envUrl.trim() : '';
}

export function saveMayarPaymentLinks(individuUrl: string, sekolahUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MAYAR_INDIVIDU, individuUrl.trim());
    localStorage.setItem(STORAGE_KEY_MAYAR_SEKOLAH, sekolahUrl.trim());
  } catch {
    // ignore
  }
}

export const ONE_TIME_PLANS: Record<OneTimePlanId, OneTimePlan> = {
  pro_individu: {
    id: 'pro_individu',
    name: 'Lisensi Guru Mandiri (Biasa)',
    badge: 'Paling Populer • Sekali Beli',
    originalPrice: 249000,
    price: 99000,
    priceFormatted: 'Rp 99.000',
    originalPriceFormatted: 'Rp 249.000',
    subtitle: 'Sekali bayar akses selamanya (Lifetime) — Didukung Gemini Flash AI Cepat',
    targetAudience: '1 Guru Mandiri (Dukungan 2 Perangkat: Laptop + HP)',
    features: [
      'Akses Selamanya (Sekali Beli, Tanpa Tagihan Bulanan)',
      'Generator Soal Evaluasi, Rangkuman, & LKPD Tanpa Batas Kuota',
      'Ekspor Word (.docx) Resmi & Paket Supervisi (.zip) Bebas Watermark',
      'Modul Ajar, ATP, Prota, Promes, Presensi, & Jurnal Lengkap',
    ],
    paymentLinkEnv: (import.meta as any).env?.VITE_PAYMENT_LINK_INDIVIDU || '',
  },
  pro_sekolah: {
    id: 'pro_sekolah',
    name: 'Lisensi Kolektif Sekolah',
    badge: 'Hemat 70% • Dana BOS / SPJ',
    originalPrice: 1499000,
    price: 749000,
    priceFormatted: 'Rp 749.000',
    originalPriceFormatted: 'Rp 1.499.000',
    subtitle: 'Sekali bayar untuk 25 Guru — Dilengkapi Kwitansi Resmi SPJ Sekolah',
    targetAudience: 'Hingga 25 Guru / Perangkat dalam 1 Sekolah atau Komunitas MGMP',
    features: [
      'Lisensi Guru Mandiri Permanen untuk 25 Guru (Hanya ~Rp 29.900 / guru)',
      'Bebas Kuota Dokumen untuk Seluruh Mata Pelajaran & Jenjang',
      'Kwitansi & Faktur Pembelian Digital Resmi untuk SPJ Dana BOS',
      'Kustomisasi Penuh Kop Surat & Identitas Instansi Sekolah',
    ],
    paymentLinkEnv: (import.meta as any).env?.VITE_PAYMENT_LINK_SEKOLAH || '',
  },
  pro_ai: {
    id: 'pro_ai',
    name: 'Lisensi Guru Mandiri PRO',
    badge: 'Segera Hadir • Model AI Cerdas',
    originalPrice: 399000,
    price: 199000,
    priceFormatted: 'Rp 199.000',
    originalPriceFormatted: 'Rp 399.000',
    subtitle: 'Didukung Gemini Pro AI dengan penalaran mendalam & analisis soal HOTS kompleks',
    targetAudience: 'Guru Profesional & Penulis Soal Standar AKM / Olimpiade',
    features: [
      'Model AI Gemini Pro untuk Penalaran Logika & HOTS Tingkat Tinggi',
      'Kualitas Narasi Stimulus & Pembahasan Soal Jauh Lebih Mendalam',
      'Seluruh Fitur Lisensi Biasa Tanpa Batas Kuota & Bebas Watermark',
      'Prioritas Pemrosesan AI dengan Respon Optimal',
    ],
    isComingSoon: true,
  },
  sekolah_pro: {
    id: 'sekolah_pro',
    name: 'Lisensi Kolektif Sekolah PRO',
    badge: 'Segera Hadir • AI Enterprise',
    originalPrice: 2999000,
    price: 1499000,
    priceFormatted: 'Rp 1.499.000',
    originalPriceFormatted: 'Rp 2.999.000',
    subtitle: 'Kecerdasan Gemini Pro AI untuk 25 Guru dalam 1 Instansi Sekolah',
    targetAudience: 'Sekolah Penggerak & Lembaga Pendidikan Unggulan',
    features: [
      'Model Gemini Pro AI untuk 25 Guru di Sekolah Anda',
      'SPJ & Kwitansi Resmi Pembelian Berbadan Hukum Dana BOS',
      'Dukungan Prioritas Dedicated dan Pelatihan Guru',
      'Kustomisasi Kurikulum Berdiferensiasi & P5 Sekolah Penuh',
    ],
    isComingSoon: true,
  },
};

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'qris',
    name: 'QRIS Instan (Semua Bank & E-Wallet)',
    category: 'QRIS Instan',
    description: 'Scan dari BRImo, Livin Mandiri, BCA Mobile, BNI, GoPay, DANA, OVO, atau ShopeePay',
    feeText: 'Bebas Biaya Admin • Aktivasi Otomatis Detik Itu Juga',
  },
  {
    id: 'va_bri',
    name: 'BRI Virtual Account (BRIVA)',
    category: 'Virtual Account Bank',
    description: 'Bayar otomatis melalui BRImo, ATM BRI, atau Internet Banking BRI',
    feeText: 'Verifikasi Otomatis 24 Jam',
    vaPrefix: '88810',
  },
  {
    id: 'va_mandiri',
    name: 'Mandiri Virtual Account (Livin)',
    category: 'Virtual Account Bank',
    description: 'Bayar otomatis melalui aplikasi Livin by Mandiri atau ATM Mandiri',
    feeText: 'Verifikasi Otomatis 24 Jam',
    vaPrefix: '89022',
  },
  {
    id: 'va_bca',
    name: 'BCA Virtual Account',
    category: 'Virtual Account Bank',
    description: 'Bayar otomatis melalui myBCA, BCA Mobile, atau KlikBCA',
    feeText: 'Verifikasi Otomatis 24 Jam',
    vaPrefix: '39015',
  },
  {
    id: 'va_bni',
    name: 'BNI Virtual Account',
    category: 'Virtual Account Bank',
    description: 'Bayar otomatis melalui Wondr by BNI, BNI Mobile, atau ATM BNI',
    feeText: 'Verifikasi Otomatis 24 Jam',
    vaPrefix: '82410',
  },
];

export function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

function deterministicDigitsFromDevice(deviceId: string, length: number): string {
  let acc = 2166136261;
  for (let i = 0; i < deviceId.length; i++) {
    acc ^= deviceId.charCodeAt(i);
    acc = Math.imul(acc, 16777619);
  }
  const positive = Math.abs(acc);
  return String(positive).padStart(length, '4').slice(0, length);
}

export function createPaymentInvoiceSession(params: {
  planId: OneTimePlanId;
  methodId: PaymentMethodId;
  buyerName: string;
  buyerEmail: string;
  deviceId: string;
}): PaymentInvoiceSession {
  const plan = ONE_TIME_PLANS[params.planId];
  const method = PAYMENT_METHODS.find((m) => m.id === params.methodId) || PAYMENT_METHODS[0];

  const devDigits = deterministicDigitsFromDevice(params.deviceId, 8);
  const uniqueCode = (Number(devDigits.slice(0, 3)) % 250) + 11;
  const totalAmount = method.id === 'qris' ? plan.price : plan.price + uniqueCode;

  const now = new Date();
  const exp = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const invoiceId = `INV-${datePart}-${devDigits.slice(0, 5)}`;

  const virtualAccountNumber = method.vaPrefix ? `${method.vaPrefix}${devDigits}` : undefined;
  const qrisPayload =
    method.id === 'qris'
      ? `00020101021226610016ID.CO.ASESMERDEKA.WWW011893600914${devDigits}0215${invoiceId}520458125303360540${totalAmount}5802ID5918ASESMERDEKA STUDIO6007JAKARTA6304A1B2`
      : undefined;

  let externalCheckoutUrl: string | undefined;
  const configuredLink = getMayarPaymentLink(params.planId);
  if (configuredLink) {
    try {
      const url = new URL(configuredLink);
      url.searchParams.set('device_id', params.deviceId);
      url.searchParams.set('invoice_id', invoiceId);
      if (params.buyerEmail) url.searchParams.set('email', params.buyerEmail);
      if (params.buyerName) url.searchParams.set('name', params.buyerName);
      externalCheckoutUrl = url.toString();
    } catch {
      externalCheckoutUrl = configuredLink;
    }
  }

  return {
    invoiceId,
    planId: plan.id,
    planName: plan.name,
    methodId: method.id,
    methodName: method.name,
    buyerName: params.buyerName.trim() || 'Bapak/Ibu Guru',
    buyerEmail: params.buyerEmail.trim() || 'guru@sekolah.sch.id',
    deviceId: params.deviceId,
    baseAmount: plan.price,
    uniqueCode: method.id === 'qris' ? 0 : uniqueCode,
    totalAmount,
    virtualAccountNumber,
    qrisPayload,
    createdAt: now.toLocaleString('id-ID'),
    expiresAt: exp.toLocaleString('id-ID'),
    externalCheckoutUrl,
  };
}

/**
 * Memverifikasi Kode Lisensi / Voucher yang diterima setelah pelunasan Invoice Payment Gateway.
 * Menolak aktivasi jika pengguna belum memasukkan kode bukti pembayaran yang sah.
 */
export function verifyGatewayReceiptCode(receiptCode: string): {
  success: boolean;
  message: string;
  quota: UserQuota;
} {
  const clean = receiptCode.trim().toUpperCase();
  if (!clean) {
    return activateLicense('INVALID-EMPTY-RECEIPT');
  }
  return activateLicense(clean);
}
