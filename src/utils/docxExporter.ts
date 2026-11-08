import { requireActiveLicenseForAction } from './licenseManager';
import {
  exportToDocx as rawExportToDocx,
  exportRangkumanToDocx as rawExportRangkumanToDocx,
  exportKisiKisiToDocx as rawExportKisiKisiToDocx,
} from './docx/docxAsesmenRangkuman';
import {
  exportModulAjarToDocx as rawExportModulAjarToDocx,
  exportLKPDToDocx as rawExportLKPDToDocx,
  exportATPToDocx as rawExportATPToDocx,
  exportProtaToDocx as rawExportProtaToDocx,
  exportPromesToDocx as rawExportPromesToDocx,
} from './docx/docxPerangkatAjar';
import {
  exportPresensiToDocx as rawExportPresensiToDocx,
  exportJurnalMengajarToDocx as rawExportJurnalMengajarToDocx,
  exportDaftarNilaiToDocx as rawExportDaftarNilaiToDocx,
  exportRekapRaporToDocx as rawExportRekapRaporToDocx,
} from './docx/docxKelasHarian';
import {
  buildCoverDanPengesahanElements,
  buildInstrumenSupervisiElements,
  exportCoverDanPengesahanToDocx as rawExportCoverDanPengesahanToDocx,
  exportInstrumenSupervisiToDocx as rawExportInstrumenSupervisiToDocx,
  exportBundelSupervisiMasterDocx as rawExportBundelSupervisiMasterDocx,
  exportPaketSupervisiToZip as rawExportPaketSupervisiToZip,
} from './docx/docxSupervisi';
import { exportNaskahUjianToDocx as rawExportNaskahUjianToDocx } from './docx/docxUjianSemester';

export * from './docx/docxShared';
export { buildCoverDanPengesahanElements, buildInstrumenSupervisiElements };

function guardExport<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  label = 'mengunduh dokumen Word (.docx)'
): (...args: TArgs) => Promise<TReturn | undefined> {
  return async (...args: TArgs) => {
    if (!requireActiveLicenseForAction(label)) {
      return undefined;
    }
    return fn(...args);
  };
}

export const exportToDocx = guardExport(rawExportToDocx);
export const exportRangkumanToDocx = guardExport(rawExportRangkumanToDocx);
export const exportKisiKisiToDocx = guardExport(rawExportKisiKisiToDocx);

export const exportModulAjarToDocx = guardExport(rawExportModulAjarToDocx);
export const exportLKPDToDocx = guardExport(rawExportLKPDToDocx);
export const exportATPToDocx = guardExport(rawExportATPToDocx);
export const exportProtaToDocx = guardExport(rawExportProtaToDocx);
export const exportPromesToDocx = guardExport(rawExportPromesToDocx);

export const exportPresensiToDocx = guardExport(rawExportPresensiToDocx);
export const exportJurnalMengajarToDocx = guardExport(rawExportJurnalMengajarToDocx);
export const exportDaftarNilaiToDocx = guardExport(rawExportDaftarNilaiToDocx);
export const exportRekapRaporToDocx = guardExport(rawExportRekapRaporToDocx);

export const exportCoverDanPengesahanToDocx = guardExport(rawExportCoverDanPengesahanToDocx);
export const exportInstrumenSupervisiToDocx = guardExport(rawExportInstrumenSupervisiToDocx);
export const exportBundelSupervisiMasterDocx = guardExport(
  rawExportBundelSupervisiMasterDocx,
  'mengunduh Bundel Supervisi Lengkap (.docx)'
);
export const exportPaketSupervisiToZip = guardExport(
  rawExportPaketSupervisiToZip,
  'mengunduh Paket Arsip Supervisi (.zip)'
);

export const exportNaskahUjianToDocx = guardExport(rawExportNaskahUjianToDocx);
