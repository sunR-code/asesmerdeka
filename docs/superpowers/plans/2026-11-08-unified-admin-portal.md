# Unified Admin Portal & License Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated full-screen Admin Portal (`?page=admin`) protected by Admin PIN to create and manage custom licenses, monitor active vs inactive status, unbind/reset device locks when teachers switch gadgets, handle teacher feedback reports, and configure payment gateway links.

**Architecture:** A standalone full-screen React component (`src/components/admin/AdminPortal.tsx`) gated by a high-security PIN lock screen, backed by a secure serverless endpoint (`api/admin-portal.js`) storing license registries and seat bindings in Upstash Redis (with reliable offline fallback). Navigation seamlessly allows returning to the Teacher Workspace (`← Kembali ke Aplikasi Guru`).

**Tech Stack:** React 19, TypeScript, Lucide React, Upstash Redis REST API, Node.js Test Runner, Vite.

**Spec:** [`docs/superpowers/specs/2026-11-08-admin-portal-design.md`](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/superpowers/specs/2026-11-08-admin-portal-design.md)

## Global Constraints

- PIN verification MUST use the one-way cryptographic salted hash from `licenseManager.ts` (`verifyAdminKeygenPin`).
- Zero data leakage: No license list or feedback reports are ever returned to the client without a valid Admin PIN.
- No Tailwind CSS: All UI components must use native CSS variables, existing classes (`.btn`, `.form-input`, `.form-select`, `.modal-*`), and scoped inline styles matching the AsesMerdeka design system.
- Regression safety: 100% test pass rate across all existing unit tests in `tests/productionReadiness.test.mjs`.

## Review Focus

1. **Unauthenticated API Access**: Requesting `api/admin-portal.js` without `adminPin` or with incorrect PIN must return 403 Forbidden with zero data.
2. **Device Unbind / Reset**: Calling `reset_seats` on a license must wipe its `devices` array in Redis so the teacher can immediately bind their new laptop or phone.
3. **Buyer Label Retention**: Created licenses must retain their buyer label (e.g. "Bu Rina - SDN 1") across reloads and searches.
4. **Seamless Return**: Clicking `← Kembali ke Aplikasi Guru` must cleanly exit the Admin Portal and restore the user to their regular dashboard view.
5. **Mobile Responsiveness**: The table and generator cards must wrap cleanly on narrow mobile viewports without horizontal text clipping.

---

### Task 1: Serverless Backend & License Registry API (`api/admin-portal.js`)

**Files:**
- Create: `api/admin-portal.js`
- Test: `tests/productionReadiness.test.mjs`

- [x] **Step 1.1: Write failing unit test `AUD-218` in `tests/productionReadiness.test.mjs`**
  - Verify `api/admin-portal.js` rejects requests missing or with invalid PIN.
  - Verify action `auth` validates correct PIN.
  - Verify action `create_license` generates an encrypted `ASM-...` code with buyer label and adds it to registry.
  - Verify action `list_licenses` returns licenses with accurate `usedSeats`, `devices`, and status (`belum_aktif` vs `aktif`).
  - Verify action `reset_license_seats` clears the `devices` array for that license code.
  - Verify action `delete_license` removes the license from the registry.

- [x] **Step 1.2: Run `npm test` and confirm `AUD-218` fails as expected**

- [x] **Step 1.3: Implement `api/admin-portal.js`**
  - Support HTTP POST with `adminPin` and `action` (`auth`, `list_licenses`, `create_license`, `reset_license_seats`, `delete_license`).
  - Validate PIN with hash comparison.
  - Connect to Upstash Redis (`asesmerdeka:admin:license_registry:v1` and `asesmerdeka:seats:v1:<CODE>`).
  - Implement in-memory fallback for offline/development mode.

- [x] **Step 1.4: Run `npm test` and verify all 24 tests pass**

- [x] **Step 1.5: Commit Task 1**
  - Commit message: `feat(api): implement admin-portal endpoint with license registry and device reset`

---

### Task 2: Admin Portal Types and Client Service (`src/types/admin.ts`, `src/utils/adminService.ts`)

**Files:**
- Create: `src/types/admin.ts`
- Create: `src/utils/adminService.ts`

- [x] **Step 2.1: Define TypeScript interfaces in `src/types/admin.ts`**
  - `AdminLicenseItem`: `code`, `label`, `tier`, `maxSeats`, `createdAt`, `updatedAt`, `usedSeats`, `devices`, `status` (`aktif` | `belum_aktif`).
  - `CreateLicensePayload`: `planType`, `label`, `count`, `customMaxSeats`.
  - `AdminPortalTab`: `'licenses' | 'feedback' | 'settings'`.

- [x] **Step 2.2: Implement client service methods in `src/utils/adminService.ts`**
  - `verifyAdminSession(pin: string): Promise<{ ok: boolean; message?: string }>`
  - `fetchAdminLicenses(pin: string): Promise<{ ok: boolean; licenses: AdminLicenseItem[]; message?: string }>`
  - `createAdminLicense(pin: string, payload: CreateLicensePayload): Promise<{ ok: boolean; created: AdminLicenseItem[]; message?: string }>`
  - `resetAdminLicenseSeats(pin: string, code: string): Promise<{ ok: boolean; message: string }>`
  - `deleteAdminLicense(pin: string, code: string): Promise<{ ok: boolean; message: string }>`
  - LocalStorage caching and offline fallback for instant optimistic UI updates.

- [x] **Step 2.3: Run `npx oxlint --deny-warnings` and ensure 0 warnings**

- [x] **Step 2.4: Commit Task 2**
  - Commit message: `feat(admin): add admin portal types and client api service`

---

### Task 3: Full-Screen Admin Portal Components (`src/components/admin/AdminPortal.tsx`)

**Files:**
- Create: `src/components/admin/AdminPortal.tsx`
- Create: `src/components/admin/AdminLicenseTab.tsx`
- Create: `src/components/admin/AdminSettingsTab.tsx`

- [x] **Step 3.1: Implement High-Security Lock Screen in `AdminPortal.tsx`**
  - Dedicated full-screen dark/navy minimalist lock screen.
  - Shield lock icon, PIN input with auto-focus, error message feedback.
  - Safe return button: `← Kembali ke Aplikasi Guru`.

- [x] **Step 3.2: Implement Portal Dashboard Shell & Navigation**
  - Top header bar with branding, live database status pill, Quick Lock button ("🔒 Kunci"), and Return button ("← Kembali ke Aplikasi Guru").
  - 3 main tabs: `🔑 Kelola Lisensi Khusus`, `📋 Kotak Masuk Guru`, `⚙️ Pengaturan Pembayaran`.

- [x] **Step 3.3: Implement `AdminLicenseTab.tsx`**
  - **Generator Section**: Select plan type (Guru Mandiri 2 dev, Solo 1 dev, Kolektif Sekolah 25 dev, Guru PRO, Sekolah PRO), Buyer Label text input, Batch quantity (1-100), and "Buat Lisensi Resmi" button.
  - **Filter & Search Bar**: Search input by code or buyer name; filter pills: `Semua`, `Aktif (Terkunci)`, `Belum Aktif`.
  - **License Table / Card List**:
    - Columns: Kode Lisensi (`ASM-...`), Label Pemesan, Paket, Kuota Kursi (`used/max`), Status Badge, Locked Device IDs (`DEV-XXXX`), Tanggal.
    - Actions: `🔄 Reset Kunci Perangkat`, `📋 Salin Kode`, `🗑️ Hapus`.
    - Modal/Confirmation for Reset & Delete.

- [x] **Step 3.4: Integrate Unified Teacher Feedback Reports Tab**
  - Embed the feedback report inbox in Tab 2, with status filtering, status update dropdowns, deletion, and "📋 Salin Rangkuman untuk AI".

- [x] **Step 3.5: Implement `AdminSettingsTab.tsx`**
  - Payment Links for Mayar (Individual & School), Product IDs, default seats, and Cloud Tracker URL with instant validation and save feedback.

- [x] **Step 3.6: Verify styling conforms to native design system (no Tailwind)**

- [x] **Step 3.7: Commit Task 3**
  - Commit message: `feat(ui): create dedicated full-screen AdminPortal with license manager and device reset`

---

### Task 4: App Integration and Navigation Routing (`src/App.tsx`, `AppFooter.tsx`, `HelpFeedbackModal.tsx`)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/AppFooter.tsx`
- Modify: `src/components/HelpFeedbackModal.tsx`

- [ ] **Step 4.1: Add URL and State-Based Admin Portal Routing in `src/App.tsx`**
  - Check `new URLSearchParams(window.location.search).get('page') === 'admin'` or `?admin=portal`.
  - Add state `isAdminPortalOpen`.
  - When active, render `<AdminPortal onBack={() => setIsAdminPortalOpen(false)} />` full screen.

- [ ] **Step 4.2: Add Discreet Admin Portal Link in `src/components/AppFooter.tsx`**
  - Add a small discreet link in the footer next to version metadata: `🔐 Portal Admin`.

- [ ] **Step 4.3: Simplify `src/components/HelpFeedbackModal.tsx` for Teachers**
  - Remove the internal Admin PIN Gate tab from the teacher help modal so teachers see a clean, single-purpose feedback submission experience.

- [ ] **Step 4.4: Commit Task 4**
  - Commit message: `feat(navigation): integrate AdminPortal into App routing and streamline teacher help modal`

---

### Task 5: Final Verification, Testing & Production Build

- [ ] **Step 5.1: Run all unit and regression tests**
  - `npm test` (verify 24/24 tests pass).

- [ ] **Step 5.2: Run Oxlint linter**
  - `npx oxlint --deny-warnings` (verify 0 warnings, 0 errors).

- [ ] **Step 5.3: Run production build**
  - `npm run build` (verify clean Vite client compilation).

- [ ] **Step 5.4: Push to origin main**
  - Push all commits to GitHub.

- [ ] **Step 5.5: Report back to user with usage guide**

