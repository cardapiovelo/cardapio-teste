/** Reduz imagens no navegador antes de salvar (economiza espaço e dados). */

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      /* cai para o <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {File} file
 * @param {{ maxSize: number, quality?: number, keepTransparency?: boolean }} options
 * @returns {Promise<Blob>}
 */
export async function resizeImage(file, { maxSize, quality = 0.8, keepTransparency = false }) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem (JPG, PNG ou WebP).');
  const bitmap = await loadBitmap(file);
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const target = { w: Math.max(1, Math.round(width * scale)), h: Math.max(1, Math.round(height * scale)) };

  const canvas = document.createElement('canvas');
  canvas.width = target.w;
  canvas.height = target.h;
  const context = canvas.getContext('2d');
  const type = keepTransparency && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  if (type === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, target.w, target.h);
  }
  context.drawImage(bitmap, 0, 0, target.w, target.h);
  bitmap.close?.();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível processar a imagem.'))),
      type,
      quality,
    );
  });
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(blob);
  });
}
