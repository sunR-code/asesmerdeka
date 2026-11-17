import type { CustomTPItem } from './schoolProfileStorage';

export const ATP_ASSESSMENT_FORMS = [
  'Observasi',
  'Tes tertulis',
  'Praktik / unjuk kerja',
  'Proyek',
  'Portofolio',
  'Presentasi',
  'Refleksi',
  'Produk / karya',
] as const;

export type ATPAssessmentForm = (typeof ATP_ASSESSMENT_FORMS)[number];

export interface ATPDependencyIssue {
  id: string;
  tpId: string;
  kodeTP: string;
  severity: 'error' | 'warning' | 'info';
  kind:
    | 'circular_dependency'
    | 'self_reference'
    | 'out_of_order'
    | 'missing_target'
    | 'cross_phase'
    | 'empty_prerequisites';
  relatedTpIds: string[];
  message: string;
}

export interface ATPGraphAnalysis {
  valid: boolean;
  hasBlockingCycle: boolean;
  hasOutOfOrder: boolean;
  hasMissingTargets: boolean;
  hasCrossPhase: boolean;
  issues: ATPDependencyIssue[];
  issuesByTpId: Record<string, ATPDependencyIssue[]>;
  dependentsMap: Record<string, string[]>;
  missingTargetIds: string[];
  cyclePaths: string[][];
}

export interface ATPOrderChange {
  tpId: string;
  kodeTP: string;
  materiPokok: string;
  fromIndex: number;
  toIndex: number;
  reason: string;
}

export interface ATPOrderRecommendation {
  hasBlockingCycle: boolean;
  isPartial: boolean;
  blockingReason?: string;
  summaryMessage: string;
  currentOrder: string[];
  recommendedOrder: string[];
  changedCount: number;
  changes: ATPOrderChange[];
  graphAnalysis: ATPGraphAnalysis;
}

export function normalizeFaseShortLabel(fase?: string): string {
  const raw = (fase || '').trim();
  if (!raw) return '';
  const match = raw.match(/fase\s+[a-f]/i);
  if (match) return match[0].toLowerCase().replace(/\s+/g, ' ').trim();
  return raw.split('(')[0].toLowerCase().trim();
}

export function isSameFase(faseA?: string, faseB?: string): boolean {
  const normA = normalizeFaseShortLabel(faseA);
  const normB = normalizeFaseShortLabel(faseB);
  if (!normA || !normB) return true;
  return normA === normB;
}

export function analyzeATPDependencyGraph(
  orderedTpIds: string[],
  tpById: Map<string, CustomTPItem>,
  currentFase?: string
): ATPGraphAnalysis {
  const issues: ATPDependencyIssue[] = [];
  const issuesByTpId: Record<string, ATPDependencyIssue[]> = {};
  const dependentsMap: Record<string, string[]> = {};
  const missingTargetSet = new Set<string>();
  const indexById = new Map<string, number>();

  orderedTpIds.forEach((id, idx) => {
    indexById.set(id, idx);
    issuesByTpId[id] = [];
    dependentsMap[id] = [];
  });

  const pushIssue = (issue: ATPDependencyIssue) => {
    issues.push(issue);
    if (!issuesByTpId[issue.tpId]) issuesByTpId[issue.tpId] = [];
    issuesByTpId[issue.tpId].push(issue);
  };

  let anyExplicitPrereq = false;

  for (const tpId of orderedTpIds) {
    const tp = tpById.get(tpId);
    if (!tp) continue;

    if (currentFase && tp.referensiCP?.fase && !isSameFase(currentFase, tp.referensiCP.fase)) {
      pushIssue({
        id: `${tpId}::cross_phase_self`,
        tpId,
        kodeTP: tp.kode,
        severity: 'error',
        kind: 'cross_phase',
        relatedTpIds: [],
        message: `TP ${tp.kode} merujuk ${tp.referensiCP.fase}, berbeda dari fase ATP aktif (${currentFase}).`,
      });
    }

    const prereqIds = Array.isArray(tp.prasyaratTpIds)
      ? Array.from(new Set(tp.prasyaratTpIds.map((id) => String(id).trim()).filter(Boolean)))
      : [];

    if (prereqIds.length === 0) {
      continue;
    }

    anyExplicitPrereq = true;
    const tpIndex = indexById.get(tpId) ?? -1;

    for (const prereqId of prereqIds) {
      if (prereqId === tpId) {
        pushIssue({
          id: `${tpId}::self_reference`,
          tpId,
          kodeTP: tp.kode,
          severity: 'error',
          kind: 'self_reference',
          relatedTpIds: [prereqId],
          message: `TP ${tp.kode} tidak boleh menjadi prasyarat bagi dirinya sendiri.`,
        });
        continue;
      }

      const prereqTP = tpById.get(prereqId);
      if (!prereqTP || !indexById.has(prereqId)) {
        missingTargetSet.add(prereqId);
        pushIssue({
          id: `${tpId}::missing::${prereqId}`,
          tpId,
          kodeTP: tp.kode,
          severity: 'warning',
          kind: 'missing_target',
          relatedTpIds: [prereqId],
          message: `Prasyarat TP (${prereqId}) untuk TP ${tp.kode} tidak ditemukan pada daftar ATP fase ini.`,
        });
        continue;
      }

      if (!dependentsMap[prereqId]) dependentsMap[prereqId] = [];
      if (!dependentsMap[prereqId].includes(tpId)) {
        dependentsMap[prereqId].push(tpId);
      }

      if (
        currentFase &&
        prereqTP.referensiCP?.fase &&
        !isSameFase(currentFase, prereqTP.referensiCP.fase)
      ) {
        pushIssue({
          id: `${tpId}::cross_phase::${prereqId}`,
          tpId,
          kodeTP: tp.kode,
          severity: 'error',
          kind: 'cross_phase',
          relatedTpIds: [prereqId],
          message: `Prasyarat TP ${prereqTP.kode} berasal dari fase lain (${prereqTP.referensiCP.fase}).`,
        });
      }

      const prereqIndex = indexById.get(prereqId) ?? -1;
      if (prereqIndex > tpIndex) {
        pushIssue({
          id: `${tpId}::out_of_order::${prereqId}`,
          tpId,
          kodeTP: tp.kode,
          severity: 'warning',
          kind: 'out_of_order',
          relatedTpIds: [prereqId],
          message: `TP ${tp.kode} diletakkan sebelum prasyaratnya (TP ${prereqTP.kode}).`,
        });
      }
    }
  }

  // Deteksi siklus prasyarat (DFS 3 warna: 0 unvisited, 1 visiting, 2 done)
  // Edge: prereqId -> tpId (atau telusuri prereqId dari setiap tpId untuk menemukan cycle path)
  const color = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const cyclePaths: string[][] = [];
  const seenCycleKeys = new Set<string>();

  const dfsPrereq = (nodeId: string) => {
    color.set(nodeId, 1);
    stack.push(nodeId);
    const tp = tpById.get(nodeId);
    const prereqIds = Array.isArray(tp?.prasyaratTpIds) ? tp!.prasyaratTpIds : [];

    for (const prereqId of prereqIds) {
      if (prereqId === nodeId) continue; // sudah ditangani sebagai self_reference
      if (!indexById.has(prereqId)) continue;
      const state = color.get(prereqId) ?? 0;
      if (state === 1) {
        const startIdx = stack.indexOf(prereqId);
        const rawCycle = [...stack.slice(startIdx), prereqId];
        const canonical = [...rawCycle.slice(0, -1)].sort().join('|');
        if (!seenCycleKeys.has(canonical)) {
          seenCycleKeys.add(canonical);
          cyclePaths.push(rawCycle);
          const kodeList = rawCycle.map((cid) => tpById.get(cid)?.kode || cid);
          for (const memberId of rawCycle.slice(0, -1)) {
            const memberTp = tpById.get(memberId);
            pushIssue({
              id: `${memberId}::cycle::${canonical}`,
              tpId: memberId,
              kodeTP: memberTp?.kode || memberId,
              severity: 'error',
              kind: 'circular_dependency',
              relatedTpIds: rawCycle.slice(0, -1),
              message: `Terdeteksi siklus prasyarat melingkar: ${kodeList.join(' → ')}.`,
            });
          }
        }
      } else if (state === 0) {
        dfsPrereq(prereqId);
      }
    }

    stack.pop();
    color.set(nodeId, 2);
  };

  for (const id of orderedTpIds) {
    if ((color.get(id) ?? 0) === 0) {
      dfsPrereq(id);
    }
  }

  if (!anyExplicitPrereq && orderedTpIds.length > 0) {
    const firstId = orderedTpIds[0];
    const firstTp = tpById.get(firstId);
    if (firstTp) {
      pushIssue({
        id: 'atp::empty_prerequisites',
        tpId: firstId,
        kodeTP: firstTp.kode,
        severity: 'info',
        kind: 'empty_prerequisites',
        relatedTpIds: [],
        message:
          'Relasi prasyarat antar-TP belum diatur. ATP tetap berjalan menggunakan urutan pilihan guru.',
      });
    }
  }

  const hasBlockingCycle =
    cyclePaths.length > 0 || issues.some((i) => i.kind === 'self_reference');
  const hasOutOfOrder = issues.some((i) => i.kind === 'out_of_order');
  const hasMissingTargets = missingTargetSet.size > 0;
  const hasCrossPhase = issues.some((i) => i.kind === 'cross_phase');

  return {
    valid: !hasBlockingCycle && !hasOutOfOrder && !hasMissingTargets && !hasCrossPhase,
    hasBlockingCycle,
    hasOutOfOrder,
    hasMissingTargets,
    hasCrossPhase,
    issues,
    issuesByTpId,
    dependentsMap,
    missingTargetIds: Array.from(missingTargetSet),
    cyclePaths,
  };
}

export function recommendATPOrder(
  currentOrderedIds: string[],
  tpById: Map<string, CustomTPItem>,
  currentFase?: string
): ATPOrderRecommendation {
  const validIds = currentOrderedIds.filter((id) => tpById.has(id));
  const graphAnalysis = analyzeATPDependencyGraph(validIds, tpById, currentFase);

  if (graphAnalysis.hasBlockingCycle) {
    return {
      hasBlockingCycle: true,
      isPartial: true,
      blockingReason:
        'Terdeteksi siklus atau relasi prasyarat ke diri sendiri. Perbaiki hubungan prasyarat terlebih dahulu sebelum menyusun rekomendasi urutan otomatis.',
      summaryMessage:
        'Rekomendasi urutan dibatalkan karena terdapat siklus prasyarat. Urutan guru saat ini dipertahankan.',
      currentOrder: [...validIds],
      recommendedOrder: [...validIds],
      changedCount: 0,
      changes: [],
      graphAnalysis,
    };
  }

  // Kahn's topological sort menggunakan indeks urutan guru saat ini sebagai tie-breaker deterministik.
  const indexMap = new Map<string, number>();
  validIds.forEach((id, idx) => indexMap.set(id, idx));

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const validPrereqMap = new Map<string, string[]>();

  for (const id of validIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
    validPrereqMap.set(id, []);
  }

  let linkedTPCount = 0;
  for (const id of validIds) {
    const tp = tpById.get(id);
    const prereqs = Array.isArray(tp?.prasyaratTpIds)
      ? Array.from(new Set(tp!.prasyaratTpIds)).filter(
          (pid) => pid !== id && indexMap.has(pid)
        )
      : [];
    if (prereqs.length > 0) linkedTPCount++;
    validPrereqMap.set(id, prereqs);

    for (const pid of prereqs) {
      adjacency.get(pid)!.push(id);
      inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
    }
  }

  // Prioritas pemilihan simpul tanpa prasyarat tersisa:
  // urutkan berdasarkan posisi manual guru agar rekomendasi menghormati alur guru bila tidak melanggar prasyarat.
  const ready: string[] = validIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const recommendedOrder: string[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0));
    const nextId = ready.shift()!;
    recommendedOrder.push(nextId);

    for (const dependentId of adjacency.get(nextId) || []) {
      const nextDeg = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, nextDeg);
      if (nextDeg === 0) {
        ready.push(dependentId);
      }
    }
  }

  const isPartial = linkedTPCount < validIds.length;

  const newIndexMap = new Map<string, number>();
  recommendedOrder.forEach((id, idx) => newIndexMap.set(id, idx));

  const changes: ATPOrderChange[] = [];
  recommendedOrder.forEach((id, toIndex) => {
    const fromIndex = indexMap.get(id) ?? toIndex;
    if (fromIndex === toIndex) return;
    const tp = tpById.get(id);
    const prereqCodes = (validPrereqMap.get(id) || [])
      .map((pid) => tpById.get(pid)?.kode || pid)
      .filter(Boolean);
    const dependentCodes = (graphAnalysis.dependentsMap[id] || [])
      .map((did) => tpById.get(did)?.kode || did)
      .filter(Boolean);

    let reason = 'Penyesuaian keseimbangan urutan alur belajar.';
    if (toIndex < fromIndex && dependentCodes.length > 0) {
      reason = `Dimajukan mendahului TP ${dependentCodes.join(', ')} karena menjadi prasyarat eksplisit.`;
    } else if (toIndex > fromIndex && prereqCodes.length > 0) {
      reason = `Ditempatkan setelah prasyaratnya (TP ${prereqCodes.join(', ')}).`;
    }

    changes.push({
      tpId: id,
      kodeTP: tp?.kode || id,
      materiPokok: tp?.materiPokok || '',
      fromIndex,
      toIndex,
      reason,
    });
  });

  const summaryMessage =
    changes.length === 0
      ? isPartial
        ? 'Urutan ATP guru saat ini sudah konsisten dengan prasyarat yang tersedia (hubungan prasyarat sebagian TP masih kosong).'
        : 'Urutan ATP guru saat ini sudah memenuhi seluruh relasi prasyarat.'
      : isPartial
      ? `Diusulkan ${changes.length} penyesuaian posisi berbasis prasyarat eksplisit. Catatan: sebagian TP belum memiliki prasyarat sehingga urutan guru dipertahankan sebagai dasar.`
      : `Diusulkan ${changes.length} penyesuaian posisi agar seluruh prasyarat terselesaikan sebelum TP turunannya.`;

  return {
    hasBlockingCycle: false,
    isPartial,
    summaryMessage,
    currentOrder: [...validIds],
    recommendedOrder,
    changedCount: changes.length,
    changes,
    graphAnalysis,
  };
}

export function reorderTpIdsByStep(
  orderedIds: string[],
  tpId: string,
  direction: 'up' | 'down'
): string[] {
  const idx = orderedIds.indexOf(tpId);
  if (idx < 0) return [...orderedIds];
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= orderedIds.length) return [...orderedIds];
  const next = [...orderedIds];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);
  return next;
}

export function recommendATPAssessmentPlan(
  tp: Pick<
    CustomTPItem,
    'tujuanPembelajaran' | 'kompetensiInti' | 'materiPokok' | 'subTP' | 'rencanaAsesmen'
  >,
  mataPelajaran: string
): { bentukUtama: ATPAssessmentForm[]; deskripsi: string; isEditedByGuru: boolean } {
  if (
    tp.rencanaAsesmen &&
    tp.rencanaAsesmen.isEditedByGuru &&
    tp.rencanaAsesmen.deskripsi.trim().length > 0
  ) {
    return {
      bentukUtama: (tp.rencanaAsesmen.bentukUtama || ['Observasi']) as ATPAssessmentForm[],
      deskripsi: tp.rencanaAsesmen.deskripsi.trim(),
      isEditedByGuru: true,
    };
  }

  const lowerText = `${tp.kompetensiInti || ''} ${tp.tujuanPembelajaran || ''} ${tp.materiPokok || ''}`.toLowerCase();
  const lowerMapel = (mataPelajaran || '').toLowerCase();

  if (
    /proyek|merancang|membuat produk|menciptakan|kampanye|prototipe|karya/.test(lowerText) ||
    lowerMapel.includes('pkk') ||
    lowerMapel.includes('prakarya')
  ) {
    return {
      bentukUtama: ['Proyek', 'Produk / karya', 'Presentasi'],
      deskripsi: `Proyek & Produk karya (${tp.materiPokok}) disertai presentasi hasil dan rubrik proses tim.`,
      isEditedByGuru: false,
    };
  }

  if (
    /praktik|mendemonstrasikan|memperagakan|mengukur|eksperimen|percobaan|ibadah|melafalkan/.test(lowerText) ||
    lowerMapel.includes('pjok') ||
    lowerMapel.includes('seni') ||
    lowerMapel.includes('kejuruan')
  ) {
    return {
      bentukUtama: ['Praktik / unjuk kerja', 'Observasi', 'Refleksi'],
      deskripsi: `Praktik / unjuk kerja langsung dan observasi keterampilan/sikap pada materi ${tp.materiPokok}, dilengkapi refleksi murid.`,
      isEditedByGuru: false,
    };
  }

  if (
    /presentasi|berbicara|diskusi|berargumen|mengomunikasikan|menyajikan lisan/.test(lowerText)
  ) {
    return {
      bentukUtama: ['Presentasi', 'Observasi', 'Refleksi'],
      deskripsi: `Presentasi & diskusi terstruktur menggunakan daftar cek observasi komunikasi serta refleksi pemahaman.`,
      isEditedByGuru: false,
    };
  }

  if (/menulis|menyusun teks|karangan|laporan|portofolio/.test(lowerText)) {
    return {
      bentukUtama: ['Produk / karya', 'Portofolio', 'Refleksi'],
      deskripsi: `Produk tulisan/karya terkurasi dalam portofolio bertahap dan refleksi revisi diri.`,
      isEditedByGuru: false,
    };
  }

  if (
    lowerMapel.includes('agama') ||
    lowerMapel.includes('kepercayaan') ||
    lowerMapel.includes('pancasila') ||
    lowerMapel.includes('akidah') ||
    lowerMapel.includes('fikih')
  ) {
    return {
      bentukUtama: ['Observasi', 'Praktik / unjuk kerja', 'Refleksi'],
      deskripsi: `Observasi sikap/perilaku, praktik/studi kasus nilai pada ${tp.materiPokok}, dan jurnal refleksi diri.`,
      isEditedByGuru: false,
    };
  }

  if (
    lowerMapel.includes('ipa') ||
    lowerMapel.includes('fisika') ||
    lowerMapel.includes('kimia') ||
    lowerMapel.includes('biologi')
  ) {
    return {
      bentukUtama: ['Praktik / unjuk kerja', 'Observasi', 'Tes tertulis'],
      deskripsi: `Formatif (observasi penyelidikan & LKPD eksperimen/data) serta sumatif tertulis analisis konsep ${tp.materiPokok}.`,
      isEditedByGuru: false,
    };
  }

  return {
    bentukUtama: ['Tes tertulis', 'Observasi', 'Refleksi'],
    deskripsi: `Formatif (observasi kinerja & LKPD terstruktur) dan sumatif (tes tertulis pemecahan masalah ${tp.materiPokok}).`,
    isEditedByGuru: false,
  };
}

/**
 * Menggabungkan pesan duplikat pada banner ringkasan validasi (khususnya siklus prasyarat
 * yang tercatat per simpul anggota siklus pada `issuesByTpId`), tanpa menghilangkan peringatan berbeda.
 */
export function deduplicateATPValidationIssues(
  issues: ATPDependencyIssue[]
): ATPDependencyIssue[] {
  const seenKeys = new Set<string>();
  const deduped: ATPDependencyIssue[] = [];

  for (const iss of issues) {
    let key: string;
    if (iss.kind === 'circular_dependency') {
      const cycleMembers =
        Array.isArray(iss.relatedTpIds) && iss.relatedTpIds.length > 0
          ? [...iss.relatedTpIds].sort().join('|')
          : iss.message;
      key = `circular_dependency::${cycleMembers}::${iss.message}`;
    } else {
      key = `${iss.kind}::${iss.tpId}::${iss.message}`;
    }

    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    deduped.push(iss);
  }

  return deduped;
}
