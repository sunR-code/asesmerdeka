# In-App Help & Feedback Report System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive in-app Help & Bug/Feedback Reporting system for teachers on desktop and mobile, with centralized cloud storage via Upstash Redis and a PIN-protected Admin Inbox featuring a 1-click "Salin Laporan untuk AI" summary button.

**Architecture:** A lightweight serverless endpoint (`api/feedback-reports.js`) stores and manages reports in Upstash Redis. A frontend service (`src/utils/feedbackService.ts`) interfaces with the API (with offline local fallback). A polished React modal (`src/components/HelpFeedbackModal.tsx`) provides both the teacher submission flow and the admin management inbox, wired into the main UI via `TopHeader`, `AppSidebar`, and `AppFooter`.

**Tech Stack:** React 19, TypeScript, Upstash Redis REST API, Framer Motion, Lucide React, Node.js Test Runner.

**Spec:** [docs/superpowers/specs/2026-11-08-help-feedback-system-design.md](file:///C:/Users/fajar/.gemini/antigravity/scratch/asesmerdeka/docs/superpowers/specs/2026-11-08-help-feedback-system-design.md)

## Global Constraints

- Must verify Admin PIN using hash verification compatible with `src/utils/licenseManager.ts` (`verifyAdminKeygenPin`).
- Must operate cleanly whether `UPSTASH_REDIS_REST_URL` is configured or in local/offline fallback mode.
- Must not obstruct or clash with mobile navigation (`MobileBottomNav`).
- All 20 existing unit tests must continue passing, 0 oxlint warnings/errors, and production build must succeed.

## Review Focus

1. Empty or whitespace-only report submissions: must be rejected with helpful client validation error.
2. Unauthorized access to `GET`/`PATCH`/`DELETE` on `api/feedback-reports.js`: must strictly return HTTP 401/403 when PIN is absent or incorrect.
3. Network disconnection when teacher submits a report: must gracefully save draft locally and notify user without crashing.
4. "Salin Laporan untuk AI" formatting: must produce clean, readable Markdown grouping active reports by category and context.
5. Large descriptions or special characters in user input: must be safely escaped/sanitized to prevent JSON parse errors.

---

### Task 1: Backend Serverless API (`api/feedback-reports.js`)

**Files:**
- Create: `api/feedback-reports.js`
- Test: `tests/productionReadiness.test.mjs`

**Interfaces:**
- Produces: Serverless default export `handler(req, res)` handling `POST`, `GET`, `PATCH`, `DELETE`.
  - `POST`: `{ category, description, contact, context: { activeTab, kelas, mapel, deviceId } }` -> returns `{ ok: true, report: FeedbackReport }`
  - `GET`: `{ adminPin }` -> returns `{ ok: true, reports: FeedbackReport[] }`
  - `PATCH`: `{ adminPin, reportId, status }` -> returns `{ ok: true, report: FeedbackReport }`
  - `DELETE`: `{ adminPin, reportId }` -> returns `{ ok: true, deleted: true }`

- [ ] **Step 1: Write failing test in `tests/productionReadiness.test.mjs` (AUD-215)**

Add test `AUD-215: API feedback-reports menangani POST laporan baru, menolak GET/PATCH/DELETE tanpa PIN, dan mengizinkan pengelolaan jika PIN benar`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: FAIL with "Cannot find module '../api/feedback-reports.js'"

- [ ] **Step 3: Implement `api/feedback-reports.js`**

Implement Upstash Redis list-based storage (`asesmerdeka:feedback_reports:list`), ID generator (`REP-<ts>-<rand>`), and PIN validation with constant-time/hashed check.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/productionReadiness.test.mjs`
Expected: PASS for AUD-215 and all 21 tests.

- [ ] **Step 5: Commit**

```bash
git add api/feedback-reports.js tests/productionReadiness.test.mjs
git commit -m "feat(api): implement serverless feedback-reports endpoint with admin PIN gate"
```

---

### Task 2: Types and Frontend Client Service (`src/types/feedback.ts` & `src/utils/feedbackService.ts`)

**Files:**
- Create: `src/types/feedback.ts`
- Create: `src/utils/feedbackService.ts`

**Interfaces:**
- Produces:
  - `type FeedbackCategory = 'fitur_error' | 'data_dummy' | 'ui_tampilan' | 'unduh_dokumen' | 'saran_fitur';`
  - `type FeedbackStatus = 'baru' | 'ditinjau' | 'selesai';`
  - `interface FeedbackReport { id: string; createdAt: string; category: FeedbackCategory; description: string; contact?: string; context: { activeTab?: string; jenjang?: string; kelas?: string; mapel?: string; deviceId?: string; isPro?: boolean }; status: FeedbackStatus; }`
  - `submitFeedbackReport(payload: Omit<FeedbackReport, 'id' | 'createdAt' | 'status'>): Promise<{ ok: boolean; message: string; report?: FeedbackReport }>`
  - `fetchFeedbackReports(adminPin: string): Promise<{ ok: boolean; message: string; reports: FeedbackReport[] }>`
  - `updateFeedbackReportStatus(adminPin: string, reportId: string, status: FeedbackStatus): Promise<{ ok: boolean; message: string }>`
  - `deleteFeedbackReport(adminPin: string, reportId: string): Promise<{ ok: boolean; message: string }>`
  - `formatReportsForAiMarkdown(reports: FeedbackReport[]): string`

- [ ] **Step 1: Write type definitions in `src/types/feedback.ts`**

Define `FeedbackCategory`, `FeedbackStatus`, and `FeedbackReport`.

- [ ] **Step 2: Implement `src/utils/feedbackService.ts`**

Implement client functions calling `/api/feedback-reports` with JSON payload, handling local storage cache fallback, and building markdown summaries for AI.

- [ ] **Step 3: Verify with unit test in `tests/productionReadiness.test.mjs`**

Verify `formatReportsForAiMarkdown` generates valid markdown containing category, context, description, and status.

- [ ] **Step 4: Commit**

```bash
git add src/types/feedback.ts src/utils/feedbackService.ts tests/productionReadiness.test.mjs
git commit -m "feat(service): add feedback types, client API service, and AI markdown formatter"
```

---

### Task 3: In-App Modal Component (`src/components/HelpFeedbackModal.tsx`)

**Files:**
- Create: `src/components/HelpFeedbackModal.tsx`

**Interfaces:**
- Consumes: `submitFeedbackReport`, `fetchFeedbackReports`, `updateFeedbackReportStatus`, `deleteFeedbackReport`, `formatReportsForAiMarkdown`, `verifyAdminKeygenPin`
- Produces: `React.FC<HelpFeedbackModalProps>`
  - Props: `{ isOpen: boolean; onClose: () => void; activeTabName?: string; schoolProfile: SchoolProfile; deviceId: string; isPro: boolean; }`

- [ ] **Step 1: Implement Component Scaffolding & Tab Switching**

Create modal with tab 1: "Kirim Kendala" and tab 2: "Kotak Masuk Admin".

- [ ] **Step 2: Implement Tab 1 (Teacher Bug & Feedback Form)**

Render category chips, description textarea, optional contact input, auto-detected context badge, and submit button with loading state.

- [ ] **Step 3: Implement Tab 2 (Admin Inbox)**

Render PIN gate (using `verifyAdminKeygenPin`), list of reported tickets with status badges, status updater dropdown, delete button, and "📋 Salin Laporan untuk AI" button with copy feedback.

- [ ] **Step 4: Verify linter and typecheck**

Run: `npx oxlint --deny-warnings`
Expected: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/HelpFeedbackModal.tsx
git commit -m "feat(ui): create HelpFeedbackModal with teacher submission form and admin inbox"
```

---

### Task 4: UI Navigation Integration (`TopHeader`, `AppSidebar`, `AppFooter`, `App.tsx`)

**Files:**
- Modify: `src/components/layout/TopHeader.tsx`
- Modify: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/layout/AppChrome.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Connects `isHelpModalOpen` state in `App.tsx` and passes `onOpenHelpModal` down to `TopHeader`, `AppSidebar`, and `AppFooter`.

- [ ] **Step 1: Add Help button in `TopHeader.tsx`**

Add a clean Help button pill (`<HelpCircle size={14} /> Bantuan`) next to the School/License pills.

- [ ] **Step 2: Add Help item in `AppSidebar.tsx`**

Add "Pusat Bantuan & Kendala" button in the sidebar footer/actions area.

- [ ] **Step 3: Add Help link in `AppChrome.tsx` (`AppFooter`)**

Add "Bantuan & Lapor" in footer navigation links.

- [ ] **Step 4: Wire Modal in `App.tsx`**

Add `const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);` and mount `<HelpFeedbackModal>` with current context.

- [ ] **Step 5: Verify build & tests**

Run: `npm test && npx oxlint --deny-warnings && npm run build`
Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/TopHeader.tsx src/components/layout/AppSidebar.tsx src/components/layout/AppChrome.tsx src/App.tsx
git commit -m "feat(navigation): integrate Help & Feedback modal triggers into header, sidebar, and footer"
```

---

### Task 5: Final Verification, Production Build, and Push

**Files:**
- Verify: Full test suite, linter, Vite build, and Git state.

- [ ] **Step 1: Run complete automated test suite**

Run: `npm test`
Expected: 21/21 passed.

- [ ] **Step 2: Run linter**

Run: `npx oxlint --deny-warnings`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Run Vite production build**

Run: `npm run build`
Expected: Clean build under ~1.2s.

- [ ] **Step 4: Push to remote repository**

Push changes to `origin main` to trigger automatic Vercel deployment.
