import { createWorker } from 'tesseract.js';

let tesseractWorker = null;

/**
 * Inicializa ou reutiliza o worker do Tesseract para OCR
 */
export async function getOcrWorker(onProgress) {
  if (!tesseractWorker) {
    tesseractWorker = await createWorker('por', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round((m.progress || 0) * 100));
        }
      }
    });
  }
  return tesseractWorker;
}

/**
 * Executa OCR sobre um Canvas ou Imagem
 */
export async function performOcrOnCanvas(canvas, onProgress) {
  const worker = await getOcrWorker(onProgress);
  const ret = await worker.recognize(canvas);
  return ret.data.text || '';
}
