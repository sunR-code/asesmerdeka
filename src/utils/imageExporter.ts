import { toPng } from 'html-to-image';
import saveAs from 'file-saver';

export async function exportElementToImage(
  element: HTMLElement, 
  filename = 'dokumen_asesmerdeka',
  options?: { backgroundColor?: string }
): Promise<void> {
  try {
    // Generate high resolution PNG (pixelRatio 2 ensures sharp text on mobile screens & print)
    const dataUrl = await toPng(element, {
      quality: 0.98,
      pixelRatio: 2,
      backgroundColor: options?.backgroundColor || '#ffffff',
      cacheBust: true,
      filter: (node) => {
        // Exclude elements with class 'no-print' or 'no-image-export'
        if (node instanceof HTMLElement && (node.classList.contains('no-print') || node.classList.contains('no-image-export'))) {
          return false;
        }
        return true;
      }
    });

    const cleanFilename = filename.replace(/[^a-zA-Z0-9_\s-]/g, '').trim() || 'dokumen_asesmerdeka';
    saveAs(dataUrl, `${cleanFilename}.png`);
  } catch (error: any) {
    console.error('Gagal mengekspor gambar:', error);
    throw new Error(`Gagal membuat file gambar: ${error.message || 'Terjadi kesalahan sistem'}`);
  }
}

