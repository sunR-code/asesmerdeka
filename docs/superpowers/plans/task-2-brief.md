# Task 2 Brief: Admin Portal Types and Client Service (`src/types/admin.ts`, `src/utils/adminService.ts`)

## Goal
Implement TypeScript interfaces and client API service for the Admin Portal, connecting UI components to `/api/admin-portal` with reliable offline/session fallback.

## Files to Create
1. `src/types/admin.ts`:
   - `AdminPlanType`: `'individu' | 'solo' | 'sekolah' | 'pro' | 'sekolah_pro'`
   - `AdminLicenseItem`:
     - `code: string`
     - `label: string`
     - `planType: AdminPlanType`
     - `tier: string`
     - `maxSeats: number`
     - `createdAt: string`
     - `updatedAt?: string`
     - `usedSeats: number`
     - `devices: string[]`
     - `status: 'aktif' | 'belum_aktif'`
   - `CreateLicensePayload`:
     - `planType: AdminPlanType`
     - `label: string`
     - `count?: number`
     - `customMaxSeats?: number`
   - `AdminPortalTab`: `'licenses' | 'feedback' | 'settings'`
   - Constants for plan metadata (e.g., `ADMIN_PLAN_META` with names, default max seats, badges).

2. `src/utils/adminService.ts`:
   - Functions:
     - `verifyAdminSession(pin: string): Promise<{ ok: boolean; message: string }>`
     - `fetchAdminLicenses(pin: string): Promise<{ ok: boolean; licenses: AdminLicenseItem[]; message?: string }>`
     - `createAdminLicense(pin: string, payload: CreateLicensePayload): Promise<{ ok: boolean; created: AdminLicenseItem[]; message?: string }>`
     - `resetAdminLicenseSeats(pin: string, code: string): Promise<{ ok: boolean; message: string }>`
     - `deleteAdminLicense(pin: string, code: string): Promise<{ ok: boolean; message: string }>`
     - Session management:
       - `saveAdminSessionPin(pin: string): void` (saves to `sessionStorage`)
       - `getAdminSessionPin(): string`
       - `clearAdminSessionPin(): void`
     - Offline / development fallback:
       - If `/api/admin-portal` returns network error or 404 in static dev, use client-side computation from `src/utils/licenseManager.ts` and `localStorage` so testing works seamlessly anywhere.

3. Testing & Verification:
   - Run `npx oxlint --deny-warnings` (must be 0 errors, 0 warnings).
   - Run `npm test` (all 24 existing tests must remain passing).
   - Run `npm run build` (TypeScript check `tsc -b` must succeed with 0 errors).

