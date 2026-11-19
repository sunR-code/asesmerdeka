/**
 * Utilitas routing & pintasan navigasi untuk Dedicated Admin Portal AsesMerdeka.
 * Menjaga satu titik masuk tunggal (?page=admin / ?admin=portal / ?admin=1 / @admin)
 * tanpa menyisipkan non-component exports ke file komponen React.
 */

export const OPEN_ADMIN_PORTAL_EVENT = 'asesmerdeka:open-admin-portal';

/**
 * Memeriksa apakah input kode lisensi merupakan pintasan menuju Dedicated Admin Portal.
 */
export function isAdminShortcutInput(rawInput: string): boolean {
  return rawInput.trim().toLowerCase() === '@admin';
}

/**
 * Menutup modal lisensi dan mengirim event global untuk membuka Dedicated Admin Portal (Lock Screen).
 */
export function triggerAdminPortalShortcut(onCloseModal: () => void): void {
  onCloseModal();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(OPEN_ADMIN_PORTAL_EVENT));
  }
}

/**
 * Memeriksa apakah parameter query URL saat ini mengarah ke Dedicated Admin Portal.
 */
export function checkIsAdminUrl(search?: string): boolean {
  const query =
    typeof search === 'string'
      ? search
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
  if (!query) return false;
  const params = new URLSearchParams(query);
  const page = params.get('page');
  const admin = params.get('admin');
  return page === 'admin' || admin === 'portal' || admin === '1';
}
