# Task 1 Brief: Serverless Backend & License Registry API (`api/admin-portal.js`)

## Goal
Implement a secure Vercel serverless function at `api/admin-portal.js` and add an automated test suite `AUD-218` in `tests/productionReadiness.test.mjs`.

## Requirements
1. **Endpoint `api/admin-portal.js`**:
   - HTTP Method: POST only (return 405 for other methods).
   - Body format: JSON with `adminPin` and `action`.
   - **PIN Authentication**:
     - Verify `adminPin` using salted hash:
       `computeHash36('ADMIN_KEYGEN_V1:' + String(adminPin || '').trim() + ':MERDEKA_SALT_2026') === '2BUG1JLCPHD'`
       (Also support `process.env.VITE_ADMIN_PIN` if configured).
     - Return status 403 `{ ok: false, message: 'PIN Admin tidak valid atau tidak memiliki hak akses.' }` if PIN is invalid.
   - **Actions Supported**:
     1. `action: 'auth'`
        - If PIN valid, return `{ ok: true, message: 'Autentikasi Admin berhasil.' }`.
     2. `action: 'list_licenses'`
        - Read registry index `asesmerdeka:admin:license_registry:v1` from Upstash Redis (or in-memory fallback).
        - For each license code, query `asesmerdeka:seats:v1:<CODE>` to get the live `devices` list.
        - Return `{ ok: true, licenses: [...] }` where each item has:
          `code`, `label`, `tier`, `maxSeats`, `createdAt`, `updatedAt`, `usedSeats`, `devices`, `status: devices.length > 0 ? 'aktif' : 'belum_aktif'`.
     3. `action: 'create_license'`
        - Payload: `planType` ('individu' | 'solo' | 'sekolah' | 'pro' | 'sekolah_pro'), `label` (string), `count` (number, default 1).
        - Generate official encrypted code(s) using algorithm matching `computeSerialLicenseCode` or appropriate prefix:
          - 'individu' -> `GM26` (maxSeats: 2)
          - 'solo' -> `SL26` (maxSeats: 1)
          - 'sekolah' -> `SK26` (maxSeats: 25)
          - 'pro' -> `GP26` (maxSeats: 2)
          - 'sekolah_pro' -> `SP26` (maxSeats: 25)
        - Save initial seat record to `asesmerdeka:seats:v1:<CODE>` with `{ licenseCode, maxSeats, devices: [], updatedAt }`.
        - Add to registry index.
        - Return `{ ok: true, created: [...] }`.
     4. `action: 'reset_license_seats'`
        - Payload: `licenseCode`.
        - Clears `devices: []` in `asesmerdeka:seats:v1:<CODE>`.
        - Returns `{ ok: true, message: 'Kunci perangkat berhasil di-reset.' }`.
     5. `action: 'delete_license'`
        - Payload: `licenseCode`.
        - Removes code from registry index and deletes seat record.
        - Returns `{ ok: true, message: 'Lisensi berhasil dihapus.' }`.
2. **Automated Unit Test `AUD-218` in `tests/productionReadiness.test.mjs`**:
   - Test that unauthenticated/invalid PIN requests are rejected with status 403.
   - Test action `auth` succeeds with valid PIN.
   - Test action `create_license` creates a license item with label and maxSeats.
   - Test action `list_licenses` returns the created license with status `'belum_aktif'` and 0 usedSeats.
   - Simulate a device claiming the seat in the seat record, test `list_licenses` shows status `'aktif'` with the device ID.
   - Test action `reset_license_seats` wipes the devices and resets status to `'belum_aktif'`.
   - Test action `delete_license` removes the license.

## Verification
- Run `npm test` and verify all tests pass (including `AUD-218`).
- Run `npx oxlint --deny-warnings` and verify 0 errors, 0 warnings.
- Commit when done.

