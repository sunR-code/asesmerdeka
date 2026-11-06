import type { AsesmenDokumen } from '../types/assessment';

const STORAGE_KEY_BANK = 'asesmerdeka_bank_soal';
const MAX_BANK_SOAL_ITEMS = 50;

function safeSaveBankList(list: AsesmenDokumen[]): void {
  const capped = list.slice(0, MAX_BANK_SOAL_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(capped));
  } catch (err) {
    console.warn('Kuota localStorage hampir penuh, memangkas arsip lama Bank Soal:', err);
    try {
      const emergencyCapped = capped.slice(0, Math.max(5, Math.floor(capped.length / 2)));
      localStorage.setItem(STORAGE_KEY_BANK, JSON.stringify(emergencyCapped));
    } catch (innerErr) {
      console.error('Gagal menyimpan ke Bank Soal karena batas penyimpanan peramban:', innerErr);
    }
  }
}

export function getBankSoal(): AsesmenDokumen[] {
  const raw = localStorage.getItem(STORAGE_KEY_BANK);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as AsesmenDokumen[]) : [];
    } catch {
      // fallback
    }
  }
  return [];
}

export function saveToBankSoal(doc: AsesmenDokumen): void {
  const list = getBankSoal();
  const existingIdx = list.findIndex((item) => item.id === doc.id);
  let updated: AsesmenDokumen[];
  if (existingIdx >= 0) {
    updated = [...list];
    updated[existingIdx] = doc;
  } else {
    updated = [doc, ...list];
  }
  safeSaveBankList(updated);
}

export function deleteFromBankSoal(id: string): AsesmenDokumen[] {
  const list = getBankSoal();
  const updated = list.filter((item) => item.id !== id);
  safeSaveBankList(updated);
  return updated;
}

export function downloadJsonAssessment(doc: AsesmenDokumen): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(doc, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${doc.judul.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
