import {
  activateLicense,
  deductQuota,
  getUserQuota,
  refundQuota,
  isLicensed,
  isLocallyRevokedLicense,
  isLegacyRevokedCode,
  normalizeLicenseCodeInput,
} from './licenseManager';
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
  status?: 'pending_payment' | 'paid' | 'payment_failed' | 'expired';
  transactionId?: string;
}

const STORAGE_KEY_MAYAR_INDIVIDU = 'asesmerdeka_mayar_link_individu';
const STORAGE_KEY_MAYAR_SEKOLAH = 'asesmerdeka_mayar_link_sekolah';
const STORAGE_KEY_PAYMENT_TX_BINDINGS = 'asesmerdeka_payment_tx_bindings_v1';

interface ServerVerifiedTxRecord {
  transactionId?: string;
  licenseCode?: string;
  planType?: string;
  amount?: number;
  invoiceId?: string | null;
  orderId?: string | null;
  deviceId?: string | null;
  customerEmail?: string | null;
  status?: string;
  verifiedBy?: string;
}

const createdInvoiceRegistry = new Map<string, PaymentInvoiceSession>();
const serverVerifiedTxCache = new Map<string, ServerVerifiedTxRecord>();

export function clearPaymentGatewayClientCaches(): void {
  createdInvoiceRegistry.clear();
  serverVerifiedTxCache.clear();
}

function getServerPaymentAuthority(): {
  verifiedTransactions?: Map<string, ServerVerifiedTxRecord>;
  paymentOrders?: Map<string, Partial<PaymentInvoiceSession>>;
} | null {
  try {
    const auth = (globalThis as unknown as { __ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__?: unknown })
      .__ASESMERDEKA_SERVER_PAYMENT_AUTHORITY__;
    return auth && typeof auth === 'object'
      ? (auth as {
          verifiedTransactions?: Map<string, ServerVerifiedTxRecord>;
          paymentOrders?: Map<string, Partial<PaymentInvoiceSession>>;
        })
      : null;
  } catch {
    return null;
  }
}

function getServerAuthorityOrder(invoiceId: string): Partial<PaymentInvoiceSession> | null {
  const cleanInv = String(invoiceId || '').trim().toUpperCase();
  if (!cleanInv) return null;
  const auth = getServerPaymentAuthority();
  if (!auth?.paymentOrders) return null;
  return (
    auth.paymentOrders.get(`asesmerdeka:mayar:order:v1:${cleanInv}`) ||
    auth.paymentOrders.get(cleanInv) ||
    null
  );
}

function getServerVerifiedTransaction(txId: string): ServerVerifiedTxRecord | null {
  const cleanTx = String(txId || '').trim().toUpperCase();
  if (!cleanTx) return null;
  const cached = serverVerifiedTxCache.get(cleanTx);
  if (cached && cached.status === 'paid' && Boolean(cached.verifiedBy)) {
    return cached;
  }
  const auth = getServerPaymentAuthority();
  if (!auth?.verifiedTransactions) return null;
  const candidate =
    auth.verifiedTransactions.get(`asesmerdeka:mayar:tx:v1:${cleanTx}`) ||
    auth.verifiedTransactions.get(cleanTx) ||
    null;
  if (candidate && candidate.status === 'paid' && Boolean(candidate.verifiedBy)) {
    return candidate;
  }
  return null;
}

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
    name: 'Lisensi Guru Mandiri',
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
      'Seluruh Fitur Lisensi Guru Mandiri Tanpa Batas Kuota & Bebas Watermark',
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

  const createdSession: PaymentInvoiceSession = {
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
    status: 'pending_payment',
  };

  createdInvoiceRegistry.set(invoiceId.toUpperCase(), { ...createdSession });

  return createdSession;
}

function getTxBindings(): Record<string, { licenseCode: string; amount: number; processedAt: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYMENT_TX_BINDINGS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveTxBinding(txId: string, licenseCode: string, amount: number): void {
  try {
    const map = getTxBindings();
    map[txId.trim().toUpperCase()] = {
      licenseCode: normalizeLicenseCodeInput(licenseCode),
      amount,
      processedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_PAYMENT_TX_BINDINGS, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function applyPaymentGatewayCallback(
  session: PaymentInvoiceSession,
  callback: {
    status: 'paid' | 'settled' | 'pending' | 'failed' | 'cancelled' | 'expired';
    transactionId?: string;
    paidAmount?: number;
    licenseCode?: string;
    teacherPin?: string;
  }
): {
  ok: boolean;
  session: PaymentInvoiceSession;
  activated: boolean;
  idempotentReplay?: boolean;
  reason?: string;
  message: string;
  quota: UserQuota;
} {
  const status = String(callback.status || '').toLowerCase();
  if (status === 'pending') {
    return {
      ok: false,
      activated: false,
      reason: 'PAYMENT_PENDING',
      session: { ...session, status: 'pending_payment' },
      message: 'Pembayaran masih pending. Lisensi belum diaktifkan sebelum pelunasan terkonfirmasi oleh server.',
      quota: getUserQuota(),
    };
  }

  if (status === 'failed' || status === 'cancelled' || status === 'expired') {
    const nextStatus = status === 'expired' ? 'expired' : 'payment_failed';
    return {
      ok: false,
      activated: false,
      reason: status === 'expired' ? 'PAYMENT_EXPIRED' : 'PAYMENT_FAILED',
      session: { ...session, status: nextStatus },
      message: `Pembayaran ${status === 'expired' ? 'kedaluwarsa' : 'gagal / dibatalkan'}. Lisensi tidak diaktifkan.`,
      quota: getUserQuota(),
    };
  }

  // Zero-Trust Browser Check: Validasi pesanan & catatan transaksi otoritatif dari server Mayar.id
  const canonicalPlan = ONE_TIME_PLANS[session.planId];
  const originalOrder =
    createdInvoiceRegistry.get(String(session.invoiceId || '').trim().toUpperCase()) ||
    getServerAuthorityOrder(session.invoiceId);

  if (
    !canonicalPlan ||
    session.baseAmount !== canonicalPlan.price ||
    (originalOrder &&
      (originalOrder.planId !== session.planId ||
        originalOrder.baseAmount !== session.baseAmount ||
        (originalOrder.deviceId &&
          session.deviceId &&
          String(originalOrder.deviceId).trim().toUpperCase() !==
            String(session.deviceId).trim().toUpperCase())))
  ) {
    return {
      ok: false,
      activated: false,
      reason: 'PLAN_TAMPERED',
      session: { ...session, status: 'pending_payment' },
      message: 'Data paket atau sesi invoice telah dimanipulasi di browser.',
      quota: getUserQuota(),
    };
  }

  const txId = String(callback.transactionId || '').trim().toUpperCase();
  const serverTx = txId ? getServerVerifiedTransaction(txId) : null;
  if (!txId || !serverTx || serverTx.status !== 'paid') {
    return {
      ok: false,
      activated: false,
      reason: 'UNVERIFIED_PAYMENT_TRANSACTION',
      session: { ...session, status: 'pending_payment' },
      message: 'Transaksi belum terverifikasi oleh server Mayar.id. Status pembayaran dari browser ditolak.',
      quota: getUserQuota(),
    };
  }

  const canonicalMinAmount = canonicalPlan.price;
  if (
    callback.paidAmount !== undefined &&
    (Number(callback.paidAmount) < canonicalMinAmount ||
      Number(callback.paidAmount) !== Number(serverTx.amount))
  ) {
    return {
      ok: false,
      activated: false,
      reason: 'AMOUNT_MANIPULATED',
      session: { ...session, status: 'payment_failed' },
      message: 'Nominal pembayaran dari browser tidak sesuai dengan catatan transaksi server.',
      quota: getUserQuota(),
    };
  }

  if (Number(serverTx.amount) < canonicalMinAmount) {
    return {
      ok: false,
      activated: false,
      reason: 'AMOUNT_MISMATCH',
      session: { ...session, status: 'payment_failed' },
      message: `Nominal transaksi server (${serverTx.amount}) kurang dari harga paket (${canonicalMinAmount}).`,
      quota: getUserQuota(),
    };
  }

  const expectSchool = session.planId === 'pro_sekolah' || session.planId === 'sekolah_pro';
  const txIsSchool = serverTx.planType === 'sekolah' || serverTx.planType === 'sekolah_pro';
  const cleanCode = normalizeLicenseCodeInput(callback.licenseCode || serverTx.licenseCode || '');
  const codeIsSchool =
    cleanCode.startsWith('ASM-SK26-') ||
    cleanCode.startsWith('ASM-SP26-') ||
    cleanCode.startsWith('ASM-STG2-SK26-') ||
    cleanCode.startsWith('ASM-STG2-SP26-');
  if (expectSchool !== txIsSchool || (cleanCode && expectSchool !== codeIsSchool)) {
    return {
      ok: false,
      activated: false,
      reason: 'PRODUCT_PLAN_MISMATCH',
      session: { ...session, status: 'payment_failed' },
      message: 'Jenis paket pada invoice tidak sesuai dengan transaksi server.',
      quota: getUserQuota(),
    };
  }

  if (
    serverTx.licenseCode &&
    cleanCode &&
    normalizeLicenseCodeInput(serverTx.licenseCode) !== cleanCode
  ) {
    return {
      ok: false,
      activated: false,
      reason: 'TRANSACTION_ALREADY_BOUND',
      session: { ...session, status: 'pending_payment' },
      message: 'ID transaksi sudah terikat pada kode lisensi lain.',
      quota: getUserQuota(),
    };
  }

  const txInvoice = String(serverTx.invoiceId || '').trim().toUpperCase();
  const sessInvoice = String(session.invoiceId || '').trim().toUpperCase();
  const txDevice = String(serverTx.deviceId || '').trim().toUpperCase();
  const sessDevice = String(session.deviceId || '').trim().toUpperCase();
  const txEmail = String(serverTx.customerEmail || '').trim().toLowerCase();
  const sessEmail = String(session.buyerEmail || '').trim().toLowerCase();
  if (
    (txInvoice && sessInvoice && txInvoice !== sessInvoice) ||
    (txDevice && sessDevice && txDevice !== sessDevice) ||
    (txEmail && sessEmail && txEmail !== sessEmail)
  ) {
    return {
      ok: false,
      activated: false,
      reason: 'TRANSACTION_OWNERSHIP_MISMATCH',
      session: { ...session, status: 'pending_payment' },
      message: 'Transaksi ini terdaftar untuk pengguna atau perangkat lain.',
      quota: getUserQuota(),
    };
  }

  if (!cleanCode) {
    return {
      ok: false,
      activated: false,
      reason: 'AWAITING_LICENSE_CODE',
      session: { ...session, status: 'paid', transactionId: txId },
      message: 'Pembayaran lunas terverifikasi server, menunggu kode lisensi resmi.',
      quota: getUserQuota(),
    };
  }

  const verify = verifyGatewayReceiptCode(cleanCode, {
    transactionId: txId,
    paidAmount: Number(serverTx.amount),
    expectedMinAmount: canonicalMinAmount,
    teacherPin: callback.teacherPin,
  });

  if (!verify.success) {
    return {
      ok: false,
      activated: false,
      session: { ...session, status: 'pending_payment' },
      message: verify.message,
      quota: verify.quota,
    };
  }

  return {
    ok: true,
    activated: true,
    idempotentReplay: verify.idempotentReplay,
    session: {
      ...session,
      status: 'paid',
      transactionId: txId,
    },
    message: verify.message,
    quota: verify.quota,
  };
}

export async function verifyPaymentOrderStatusOnline(
  session: PaymentInvoiceSession,
  options?: {
    transactionId?: string;
    licenseCode?: string;
    teacherPin?: string;
  }
): Promise<{
  ok: boolean;
  session: PaymentInvoiceSession;
  activated: boolean;
  idempotentReplay?: boolean;
  reason?: string;
  message: string;
  quota: UserQuota;
}> {
  try {
    const res = await fetch('/api/activate-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_payment_order',
        invoiceId: session.invoiceId,
        transactionId: options?.transactionId || session.transactionId || '',
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
        planId: session.planId,
        licenseCode: options?.licenseCode || '',
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.verified || data?.status !== 'paid') {
      const staleTxId = String(options?.transactionId || session.transactionId || '')
        .trim()
        .toUpperCase();
      if (staleTxId) {
        serverVerifiedTxCache.delete(staleTxId);
      }
      return {
        ok: false,
        activated: false,
        reason: data?.reason || 'UNVERIFIED_PAYMENT_TRANSACTION',
        session: {
          ...session,
          status:
            data?.status === 'payment_failed' || data?.status === 'expired'
              ? data.status
              : 'pending_payment',
        },
        message: data?.message || 'Pembayaran masih menunggu konfirmasi server Mayar.id.',
        quota: getUserQuota(),
      };
    }

    const txId = String(data.transactionId || options?.transactionId || '').trim().toUpperCase();
    const resolvedPlanId = (data.planId as OneTimePlanId) || session.planId;
    const canonicalPlan = ONE_TIME_PLANS[resolvedPlanId] || ONE_TIME_PLANS[session.planId];
    const resolvedOrderId = String(data.invoiceId || session.invoiceId || '').trim().toUpperCase();

    if (txId) {
      serverVerifiedTxCache.set(txId, {
        transactionId: txId,
        licenseCode: data.licenseCode || options?.licenseCode,
        planType: data.planType,
        amount: Number(data.amount),
        invoiceId: data.invoiceId || session.invoiceId,
        orderId: data.orderId || data.invoiceId || session.invoiceId,
        deviceId: session.deviceId,
        customerEmail: session.buyerEmail,
        status: 'paid',
        verifiedBy: data.authoritySource || 'server_verify_payment_order',
      });
    }

    if (resolvedOrderId && canonicalPlan) {
      createdInvoiceRegistry.set(resolvedOrderId, {
        ...session,
        planId: canonicalPlan.id,
        baseAmount: canonicalPlan.price,
        deviceId: session.deviceId,
        buyerEmail: session.buyerEmail,
      });
    }

    return applyPaymentGatewayCallback(session, {
      status: 'paid',
      transactionId: txId,
      paidAmount: Number(data.amount),
      licenseCode: data.licenseCode || options?.licenseCode,
      teacherPin: options?.teacherPin,
    });
  } catch {
    return {
      ok: false,
      activated: false,
      reason: 'NETWORK_UNREACHABLE',
      session: { ...session, status: 'pending_payment' },
      message: 'Gagal menghubungi server verifikasi pembayaran. Status tetap menunggu.',
      quota: getUserQuota(),
    };
  }
}

/**
 * Memverifikasi Kode Lisensi / Voucher yang diterima setelah pelunasan Invoice Payment Gateway.
 * Menolak aktivasi jika kode palsu, dicabut, nominal kurang, atau 1 transaksi dipakai ulang ke lisensi berbeda.
 */
export function verifyGatewayReceiptCode(
  receiptCode: string,
  options?: {
    transactionId?: string;
    paidAmount?: number;
    expectedMinAmount?: number;
    teacherPin?: string;
  }
): {
  success: boolean;
  idempotentReplay?: boolean;
  message: string;
  quota: UserQuota;
} {
  const clean = normalizeLicenseCodeInput(receiptCode);
  if (!clean || isLegacyRevokedCode(clean) || isLocallyRevokedLicense(clean)) {
    return activateLicense('INVALID-EMPTY-RECEIPT');
  }

  if (
    typeof options?.paidAmount === 'number' &&
    typeof options?.expectedMinAmount === 'number' &&
    options.paidAmount < options.expectedMinAmount
  ) {
    return {
      success: false,
      message: `Nominal pembayaran (${options.paidAmount}) tidak mencukupi harga paket (${options.expectedMinAmount}).`,
      quota: getUserQuota(),
    };
  }

  const txId = String(options?.transactionId || '').trim().toUpperCase();
  if (txId) {
    const existingBindings = getTxBindings();
    const prior = existingBindings[txId];
    if (prior) {
      if (prior.licenseCode !== clean) {
        return {
          success: false,
          message: `ID Transaksi ${txId} sudah terikat pada lisensi lain dan tidak dapat diklaim untuk lisensi berbeda.`,
          quota: getUserQuota(),
        };
      }
      const replayRes = activateLicense(clean, { teacherPin: options?.teacherPin });
      return {
        ...replayRes,
        idempotentReplay: true,
      };
    }
  }

  const act = activateLicense(clean, { teacherPin: options?.teacherPin });
  if (act.success && txId) {
    saveTxBinding(txId, clean, options?.paidAmount ?? 0);
  }
  return act;
}
