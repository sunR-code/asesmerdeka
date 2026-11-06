import type { RangkumanRequest, RangkumanDokumen } from '../../types/summary';

export function isSDGrade(req: RangkumanRequest): boolean {
  const f = req.jenjangFase.toLowerCase();
  const k = req.kelas.trim();
  return (
    f.includes('sd') ||
    f.includes('fase a') ||
    f.includes('fase b') ||
    f.includes('fase c') ||
    ['1', '2', '3', '4', '5', '6'].includes(k)
  );
}

export function isSMPGrade(req: RangkumanRequest): boolean {
  const f = req.jenjangFase.toLowerCase();
  const k = req.kelas.trim();
  return (
    f.includes('smp') ||
    f.includes('mts') ||
    f.includes('fase d') ||
    ['7', '8', '9'].includes(k)
  );
}

export function getJenjangLabel(req: RangkumanRequest): string {
  const m = req.mataPelajaran.toLowerCase();
  if (isSDGrade(req)) return 'SD/MI';
  if (isSMPGrade(req)) return 'SMP/MTs';
  if (
    m.includes('smk') ||
    m.includes('kejuruan') ||
    m.includes('pkk') ||
    m.includes('profesi') ||
    m.includes('projek ipas')
  ) {
    return 'SMK';
  }
  return 'SMA/SMK';
}

export function cleanTopicTitle(rawTopik: string): string {
  return rawTopik
    .replace(/\s*\(Kelas\s+\d+[^)]*\)/gi, '')
    .replace(/\s*\((SD|SMP|SMA|SMK)[^)]*\)/gi, '')
    .trim();
}

export function applyGayaBahasaToRangkuman(
  doc: RangkumanDokumen,
  req: RangkumanRequest
): RangkumanDokumen {
  const gaya = req.gayaBahasa;
  if (gaya === 'Struktur Ringkas & Poin Kunci (Infografis)') {
    doc.poinUtama = doc.poinUtama.map((p) => ({
      ...p,
      analogi: undefined,
    }));
  } else if (gaya === 'Tanya-Jawab & Rumus Praktis') {
    doc.poinUtama = doc.poinUtama.map((p, idx) => {
      const cleanHeading = p.judul.replace(/^\d+\.\s*/, '');
      const asQuestion = cleanHeading.endsWith('?')
        ? `${idx + 1}. ${cleanHeading}`
        : `${idx + 1}. Bagaimana Konsep & Cara Kerja ${cleanHeading}?`;
      return {
        ...p,
        judul: asQuestion,
      };
    });
  } else if (gaya === 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)') {
    doc.poinUtama = doc.poinUtama.map((p) => ({
      ...p,
      analogi:
        p.analogi ||
        `Bayangkan konsep ini seperti aktivitas seru yang kita temukan sehari-hari di rumah atau sekolah!`,
    }));
  }
  return doc;
}
