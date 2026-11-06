# Smart LKPD Preset Studio & Contextual Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun "Smart LKPD Preset Studio" dengan 4 gaya template Kurikulum Merdeka, generator kontekstual cerdas (AI Gemini + fallback offline), inline live editing di layar pratinjau, dan ekspor Microsoft Word (.docx) berstruktur rapi.

**Architecture:** Memperluas antarmuka `LKPDDokumen` dengan data terstruktur spesifik per archetype (eksperimen, diferensiasi, proyek, kasus), membangun generator hybrid (Gemini AI terstruktur + heuristik offline), memperkaya `LKPDViewer.tsx` menjadi studio interaktif WYSIWYG dengan penyimpanan draf mandiri per TP, serta memperbarui `docxPerangkatAjar.ts` agar mengekspor tabel Word XML yang presisi.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, docx.js, Vitest, Google Generative Language API.

**Spec:** `docs/superpowers/specs/2026-11-06-smart-lkpd-preset-studio-design.md`

## Global Constraints

- Preserve all existing Kurikulum Merdeka calculation logic and school profile data structures.
- Offline-First: All 4 presets MUST generate 100% complete, rich worksheets even with 0 internet or 0 API quota.
- License Compliance: AI generation with topic keywords deducts 1 quota via `deductQuota()` when active; Trial/Pro/School tiers must be respected.
- Visual Design: Follow Dashboard V21 Bento Card archetypes, liquid sliding pills, and micro-interactions.
- Code Quality: 0 TypeScript errors (`tsc -b`), 0 oxlint warnings, all existing and new unit tests must pass.

## Review Focus

1. **Empty/Undefined Archetype Data in DOCX**: When an archetype doesn't have its specific block populated, DOCX export must gracefully omit the block without throwing `TypeError`.
2. **Offline Network Failure during AI Generation**: When network drops or API returns 429/500, user must see a friendly toast notification and immediately receive the local heuristic draft.
3. **Draft Bleed between Presets**: Switching from "Kasus" to "Eksperimen" must not overwrite or delete edits made on "Kasus" for the same TP.
4. **XSS / HTML Injection in Inline Editor**: User text inputs must be sanitized and rendered safely as plain text in both React DOM and DOCX XML.
5. **Teacher Answer Key Leak**: `panduanJawabanSingkat` must never leak into student-facing prints or student Word documents unless the teacher explicitly enables the teacher guide mode.

---

### Task 1: Data Model Schema & TypeScript Definitions

**Files:**
- Modify: `src/types/perangkatAjar.ts:65-120`
- Test: `src/types/__tests__/perangkatAjar.test.ts`

**Interfaces:**
- Produces: `LKPDPresetType`, `LKPDPertanyaanItem`, `LKPDDokumen` with `eksperimenData`, `diferensiasiData`, `proyekData`, `presetType`, and `konteksAktual`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/types/__tests__/perangkatAjar.test.ts
import { describe, it, expect } from 'vitest';
import type { LKPDDokumen, LKPDPresetType } from '../perangkatAjar';

describe('LKPDDokumen types', () => {
  it('supports all 4 archetype presets and structured data', () => {
    const presets: LKPDPresetType[] = ['kasus', 'eksperimen', 'diferensiasi', 'proyek'];
    expect(presets).toHaveLength(4);

    const doc: Partial<LKPDDokumen> = {
      presetType: 'eksperimen',
      eksperimenData: {
        alatDanBahan: ['Tabung reaksi', 'Air'],
        hipotesisAwal: 'Dugaan sementara...',
        tabelObservasi: {
          kolom: ['No', 'Perlakuan', 'Hasil'],
          baris: [['1', 'Uji A', 'Berubah warna']]
        }
      }
    };
    expect(doc.presetType).toBe('eksperimen');
    expect(doc.eksperimenData?.alatDanBahan).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/__tests__/perangkatAjar.test.ts`
Expected: FAIL (types do not exist yet).

- [ ] **Step 3: Implement expanded schema in `src/types/perangkatAjar.ts`**

Add `LKPDPresetType`, `LKPDPertanyaanItem`, `eksperimenData`, `diferensiasiData`, and `proyekData` to `LKPDDokumen`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/__tests__/perangkatAjar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/perangkatAjar.ts src/types/__tests__/perangkatAjar.test.ts
git commit -m "feat(types): expand LKPDDokumen with 4 archetype data models"
```

---

### Task 2: Multi-Archetype Heuristic Generator Engine

**Files:**
- Modify: `src/utils/perangkatAjarEngine.ts:185-320`
- Test: `src/utils/__tests__/perangkatAjarEngine.test.ts`

**Interfaces:**
- Consumes: `CustomTPItem`, `SchoolProfile`, `LKPDPresetType`
- Produces: `buildSmartLKPD(tp: CustomTPItem, profile: SchoolProfile, presetType?: LKPDPresetType, konteksAktual?: string): LKPDDokumen`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/perangkatAjarEngine.test.ts
import { describe, it, expect } from 'vitest';
import { buildSmartLKPD } from '../perangkatAjarEngine';
import type { CustomTPItem } from '../../types/perangkatAjar';
import type { SchoolProfile } from '../schoolProfileStorage';

const mockTP: CustomTPItem = {
  id: 'tp-1',
  kode: 'TP-1',
  materiPokok: 'Ekosistem dan Rantai Makanan',
  tujuanPembelajaran: 'Menganalisis hubungan antarmakhluk hidup dalam ekosistem',
  alokasiWaktu: 4,
  semester: 'Ganjil',
  mingguMulai: 1,
  mingguSelesai: 2,
};

const mockProfile: SchoolProfile = {
  namaSekolah: 'SMP Merdeka Belajar',
  namaGuru: 'Budi Santoso, S.Pd.',
  nipGuru: '198501012010011001',
  kotaSekolah: 'Jakarta',
  jenjang: 'SMP',
  kelasUtama: 'VII',
  mataPelajaranUtama: 'Ilmu Pengetahuan Alam (IPA)',
  semester: 'Ganjil',
  tahunAjaran: '2024/2025',
  rombelAktif: 'VII-A',
};

describe('buildSmartLKPD multi-archetype generator', () => {
  it('generates valid experimental worksheet with observation table', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'eksperimen');
    expect(lkpd.presetType).toBe('eksperimen');
    expect(lkpd.eksperimenData).toBeDefined();
    expect(lkpd.eksperimenData?.alatDanBahan.length).toBeGreaterThan(0);
    expect(lkpd.eksperimenData?.tabelObservasi.kolom.length).toBeGreaterThan(0);
  });

  it('generates valid differentiated worksheet with 3 tiers', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'diferensiasi');
    expect(lkpd.presetType).toBe('diferensiasi');
    expect(lkpd.diferensiasiData).toBeDefined();
    expect(lkpd.diferensiasiData?.tingkatDasar.tugas.length).toBeGreaterThan(0);
    expect(lkpd.diferensiasiData?.tingkatMenengah.tugas.length).toBeGreaterThan(0);
    expect(lkpd.diferensiasiData?.tingkatMahir.tugas.length).toBeGreaterThan(0);
  });

  it('generates valid collaborative project worksheet with roles', () => {
    const lkpd = buildSmartLKPD(mockTP, mockProfile, 'proyek');
    expect(lkpd.presetType).toBe('proyek');
    expect(lkpd.proyekData).toBeDefined();
    expect(lkpd.proyekData?.peranAnggota.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/perangkatAjarEngine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement multi-archetype generator in `src/utils/perangkatAjarEngine.ts`**

Update `buildSmartLKPD` to accept `presetType = 'kasus'` (default) and `konteksAktual?: string`. Add generators for:
- `buildKasusSection(tp, profile, konteks)`
- `buildEksperimenSection(tp, profile, konteks)`
- `buildDiferensiasiSection(tp, profile, konteks)`
- `buildProyekSection(tp, profile, konteks)`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/perangkatAjarEngine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/perangkatAjarEngine.ts src/utils/__tests__/perangkatAjarEngine.test.ts
git commit -m "feat(engine): implement 4 pedagogical archetype generators in buildSmartLKPD"
```

---

### Task 3: Contextual AI Gemini Prompt & Smart Fallback Service

**Files:**
- Create: `src/utils/lkpdAiService.ts`
- Test: `src/utils/__tests__/lkpdAiService.test.ts`

**Interfaces:**
- Consumes: `CustomTPItem`, `SchoolProfile`, `LKPDPresetType`, `deductQuota`
- Produces: `generateContextualLKPDWithAI(tp, profile, presetType, topikKonteks): Promise<{ lkpd: LKPDDokumen; usedFallback: boolean; errorMsg?: string }>`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/__tests__/lkpdAiService.test.ts
import { describe, it, expect, vi } from 'vitest';
import { generateContextualLKPDWithAI } from '../lkpdAiService';
import type { CustomTPItem } from '../../types/perangkatAjar';
import type { SchoolProfile } from '../schoolProfileStorage';

const mockTP: CustomTPItem = {
  id: 'tp-1',
  kode: 'TP-1',
  materiPokok: 'Pemanasan Global',
  tujuanPembelajaran: 'Menganalisis dampak pemanasan global',
  alokasiWaktu: 2,
  semester: 'Genap',
  mingguMulai: 1,
  mingguSelesai: 2,
};

const mockProfile: SchoolProfile = {
  namaSekolah: 'SMA Nusantara',
  namaGuru: 'Siti Aminah, M.Pd.',
  nipGuru: '198002022005012002',
  kotaSekolah: 'Surabaya',
  jenjang: 'SMA',
  kelasUtama: 'X',
  mataPelajaranUtama: 'Geografi',
  semester: 'Genap',
  tahunAjaran: '2024/2025',
  rombelAktif: 'X-1',
};

describe('generateContextualLKPDWithAI', () => {
  it('falls back gracefully to offline heuristic engine when API key is missing or offline', async () => {
    const result = await generateContextualLKPDWithAI(mockTP, mockProfile, 'kasus', 'Banjir Rob Pesisir Utara');
    expect(result.lkpd).toBeDefined();
    expect(result.lkpd.presetType).toBe('kasus');
    expect(result.usedFallback).toBe(true);
    expect(result.lkpd.stimulusKasus.teks.length).toBeGreaterThan(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/lkpdAiService.test.ts`
Expected: FAIL (`lkpdAiService` not found).

- [ ] **Step 3: Implement `src/utils/lkpdAiService.ts`**

Implement Gemini structured prompt builder for the 4 archetypes, response JSON parser, quota deduction hook, and graceful fallback to `buildSmartLKPD`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/lkpdAiService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/lkpdAiService.ts src/utils/__tests__/lkpdAiService.test.ts
git commit -m "feat(ai): add lkpdAiService with Gemini structured prompt and offline fallback"
```

---

### Task 4: Interactive Preset Studio UI with Inline Live Editor

**Files:**
- Modify: `src/components/LKPDViewer.tsx:1-326`
- Modify: `src/index.css` (studio styles & inline editable textareas)
- Test: `src/components/__tests__/LKPDViewer.test.tsx`

**Interfaces:**
- Consumes: `LKPDDokumen`, `SchoolProfile`, `buildSmartLKPD`, `generateContextualLKPDWithAI`
- Produces: Studio toolbar with 4 archetype pills, context keyword input, auto-save status pill, teacher guide toggle, and WYSIWYG inline editable document.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/LKPDViewer.test.tsx
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LKPDViewer } from '../LKPDViewer';
import { buildSmartLKPD } from '../../utils/perangkatAjarEngine';

describe('LKPDViewer Studio', () => {
  it('renders all 4 archetype pill buttons and switches active tab', () => {
    const lkpd = buildSmartLKPD(
      { id: 'tp-1', kode: 'TP-1', materiPokok: 'Pecahan', tujuanPembelajaran: 'Operasi pecahan', alokasiWaktu: 2, semester: 'Ganjil', mingguMulai: 1, mingguSelesai: 2 },
      { namaSekolah: 'SD Merdeka', namaGuru: 'Guru', nipGuru: '-', kotaSekolah: 'Bandung', jenjang: 'SD', kelasUtama: 'IV', mataPelajaranUtama: 'Matematika', semester: 'Ganjil', tahunAjaran: '2024/2025', rombelAktif: 'IV-A' }
    );

    render(
      <LKPDViewer
        lkpd={lkpd}
        onPrint={vi.fn()}
        onBackToClassHub={vi.fn()}
      />
    );

    expect(screen.getByText(/Studi Kasus/i)).toBeInTheDocument();
    expect(screen.getByText(/Eksperimen/i)).toBeInTheDocument();
    expect(screen.getByText(/Berdiferensiasi/i)).toBeInTheDocument();
    expect(screen.getByText(/Proyek/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/LKPDViewer.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Studio UI in `src/components/LKPDViewer.tsx`**

- Add Top Bento Control Panel with 4 Archetype tabs.
- Add Context Keyword input + "⚡ Generate Ulang" button with loading state.
- Add Auto-save debounce (400ms) with storage key `lkpd_${tp.id}_${presetType}`.
- Replace static text blocks with auto-expanding inline textarea editors (`title`, `stimulusKasus.teks`, `langkahAktivitas`, `pertanyaanAnalisis`).
- Add archetype-specific editors (Eksperimen table rows, Diferensiasi 3-tier task cards, Proyek roles).
- Add `[+ Tambah Pertanyaan]` button and delete icon per question.
- Add `[👁️ Tampilkan Panduan Guru / Kunci]` toggle.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/LKPDViewer.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LKPDViewer.tsx src/index.css src/components/__tests__/LKPDViewer.test.tsx
git commit -m "feat(ui): transform LKPDViewer into interactive Smart Preset Studio with inline editor"
```

---

### Task 5: Multi-Archetype DOCX Exporter

**Files:**
- Modify: `src/utils/docx/docxPerangkatAjar.ts:250-420`
- Test: `src/utils/docx/__tests__/docxPerangkatAjar.test.ts`

**Interfaces:**
- Consumes: `LKPDDokumen`, `SchoolProfile`
- Produces: `exportLKPDToDocx(lkpd: LKPDDokumen, profile: SchoolProfile, isTeacherMode?: boolean): Promise<Blob>`

- [ ] **Step 1: Write the failing test**

```typescript
// src/utils/docx/__tests__/docxPerangkatAjar.test.ts
import { describe, it, expect } from 'vitest';
import { exportLKPDToDocx } from '../docxPerangkatAjar';
import { buildSmartLKPD } from '../../perangkatAjarEngine';

describe('exportLKPDToDocx archetype support', () => {
  const profile = {
    namaSekolah: 'SMP 1', namaGuru: 'Guru', nipGuru: '-', kotaSekolah: 'Jakarta',
    jenjang: 'SMP', kelasUtama: 'VIII', mataPelajaranUtama: 'IPA',
    semester: 'Ganjil', tahunAjaran: '2024/2025', rombelAktif: 'VIII-A'
  };
  const tp = { id: 'tp-1', kode: 'TP-1', materiPokok: 'Cahaya', tujuanPembelajaran: 'Sifat cahaya', alokasiWaktu: 2, semester: 'Ganjil', mingguMulai: 1, mingguSelesai: 2 };

  it('exports valid DOCX blob for experimental archetype without throwing', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'eksperimen');
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('exports valid DOCX blob for differentiated archetype without throwing', async () => {
    const lkpd = buildSmartLKPD(tp, profile, 'diferensiasi');
    const blob = await exportLKPDToDocx(lkpd, profile);
    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/docx/__tests__/docxPerangkatAjar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement archetype table rendering in `docxPerangkatAjar.ts`**

Update `exportLKPDToDocx`:
- If `presetType === 'eksperimen'`, render Hipotesis Box and Observation Table (`Table` with clean borders and light gray headers).
- If `presetType === 'diferensiasi'`, render 3 Tiered Task Sections with badge headers (*Dasar*, *Menengah*, *Mahir*).
- If `presetType === 'proyek'`, render Role Allocation Table and Scoring Rubric Table.
- Filter out `panduanJawabanSingkat` if `!isTeacherMode`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/docx/__tests__/docxPerangkatAjar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/docx/docxPerangkatAjar.ts src/utils/docx/__tests__/docxPerangkatAjar.test.ts
git commit -m "feat(docx): render archetype-specific tables and rubrics in exportLKPDToDocx"
```

---

### Task 6: Studio State Persistence & End-to-End Verification

**Files:**
- Modify: `src/components/LKPDViewer.tsx`
- Modify: `src/components/hub/TPListSubTab.tsx` (ensure passing TP & initial preset)
- Test: Full Vitest suite & build test

- [ ] **Step 1: Run comprehensive test suite**

Run: `npm test`
Expected: All unit & integration tests pass (20+ tests).

- [ ] **Step 2: Run linter and static analysis**

Run: `npx oxlint --deny-warnings`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run production build verification**

Run: `npm run build`
Expected: `tsc -b && vite build` succeeds in < 3s with clean dist output.

- [ ] **Step 4: Final Git Commit**

```bash
git add .
git commit -m "feat: complete Smart LKPD Preset Studio with 4 archetypes, AI generator, and DOCX export"
```

