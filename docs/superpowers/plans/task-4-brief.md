# Task 4 Brief: App Integration and Navigation Routing (`src/App.tsx`, `AppFooter.tsx`, `HelpFeedbackModal.tsx`)

## Goal
Integrate the full-screen `<AdminPortal />` into the main application, hook up URL detection and footer entry point, and streamline the teacher Help modal to be a single-purpose feedback submission tool.

## Files to Modify
1. `src/App.tsx`:
   - Check URL query parameter on mount and popstate: `page === 'admin'` or `admin === 'portal'` or `admin === '1'`.
   - Maintain `isAdminPortalOpen` state.
   - When `isAdminPortalOpen` is true, render `<AdminPortal onBack={handleCloseAdminPortal} />` in full screen.
   - `handleCloseAdminPortal`: sets `isAdminPortalOpen(false)` and cleans URL search parameters (`page`, `admin`) using `window.history.replaceState`.
   - Pass `onOpenAdminPortal={() => setIsAdminPortalOpen(true)}` to `AppFooter`.
   - Listen for window event `asesmerdeka:open-admin-portal` to toggle portal.

2. `src/components/AppFooter.tsx`:
   - Add `onOpenAdminPortal?: () => void` to props.
   - Add a discreet, professional link next to version/copyright:
     - `🔐 Portal Admin (PIN)` with subtle hover effect.

3. `src/components/HelpFeedbackModal.tsx`:
   - Remove the second tab ("Kotak Masuk Admin") and the embedded admin PIN gate, leaving a clean, friendly, single-purpose report submission experience for teachers.
   - Ensure the submission flow, offline queue, and auto-context generation remain 100% intact.

4. Testing & Verification:
   - Run `npx oxlint --deny-warnings` (0 errors, 0 warnings).
   - Run `npm test` (all 25 tests pass).
   - Run `npm run build` (clean Vite production build).
   - Commit changes.

