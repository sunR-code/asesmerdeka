import type { AcademicProfileLike } from '../utils/storageIdentity';
import { resolveAcademicContext } from '../utils/storageIdentity';

export function buildAcademicContextKey(profile?: AcademicProfileLike | null): string {
  const ctx = resolveAcademicContext(profile);
  return [
    ctx.schoolId,
    ctx.tahunAjaran,
    ctx.jenjang,
    ctx.kelas,
    ctx.mataPelajaran,
    ctx.semesterCode,
  ].join('|');
}
