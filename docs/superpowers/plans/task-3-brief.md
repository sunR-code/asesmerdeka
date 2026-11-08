# Task 3 Brief: Full-Screen Admin Portal Components (`src/components/admin/AdminPortal.tsx`)

## Goal
Implement a complete, responsive, full-screen Admin Portal with high-security PIN lock screen, 3 integrated tabs (License Manager, Teacher Feedback Reports, and Payment Settings).

## Files to Create
1. `src/components/admin/AdminPortal.tsx`:
   - Full-screen container with Lock Screen (when unauthenticated) and Dashboard Shell (when unlocked).
   - Clean return button: `← Kembali ke Aplikasi Guru` (`onBack: () => void`).
   - Quick Lock button: `🔒 Kunci Portal`.
   - 3-tab switcher (`licenses`, `feedback`, `settings`).

2. `src/components/admin/AdminLicenseTab.tsx`:
   - Generator section: Plan type selector (`ADMIN_PLANS`), Buyer Label input, Batch quantity, "Buat Lisensi Resmi" button.
   - Live summary stats: Total Licenses, Active/Locked, Unused, Total Bound Devices.
   - Search & Filter bar: Filter by query, status (`semua`, `aktif`, `belum_aktif`), plan type.
   - License table with live seat bindings (`DEV-XXXX`), quick copy, `🔄 Reset Kunci Perangkat`, and `🗑️ Hapus`.

3. `src/components/admin/AdminSettingsTab.tsx`:
   - Configuration panel for Mayar payment links, Mayar product IDs, max seats per individual code, and cloud seat tracker URL.

4. Teacher Feedback Tab inside `AdminPortal.tsx`:
   - Unified inbox for teacher feedback reports (integrating `fetchFeedbackReports`, status update, deletion, and "📋 Salin Rangkuman untuk AI").

## Design & Quality Requirements
- **Strictly NO Tailwind CSS**: Use native CSS variables, existing utility classes (`.btn`, `.btn-primary`, `.btn-outline`, `.form-input`, `.form-select`, etc.), and scoped inline styles matching the AsesMerdeka design system.
- Responsive for mobile and desktop screens.
- `npx oxlint --deny-warnings` must pass with 0 errors, 0 warnings.
- `npm test` must pass 100% (25/25 tests).
- `npm run build` must succeed with 0 TypeScript errors.

