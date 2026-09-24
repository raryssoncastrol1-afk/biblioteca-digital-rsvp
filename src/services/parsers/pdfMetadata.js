/**
 * Extração e inferência de metadados de PDF (XMP, primeira página/OCR).
 * Funções puras independentes de pdfjs-dist para execução segura em Node.js e browser.
 */

/**
 * Preenche apenas os campos vazios a partir do mapa XMP (ex.: metadata.getAll() do pdfjs).
 * O Info dictionary tem prioridade — XMP só cobre lacunas.
 */
export function applyXmpFallback(fields, xmpMap) {
  if (!xmpMap || typeof xmpMap !== 'object') return fields;
  for (const [key, value] of Object.entries(xmpMap)) {
    const clean = (Array.isArray(value) ? value.join(', ') : String(value ?? '')).trim();
    if (!clean) continue;
    const k = key.toLowerCase();
    if (!fields.title && (k.endsWith(':title') || k === 'title')) fields.title = clean;
    if (!fields.author && k.endsWith(':creator')) fields.author = clean;
    if (!fields.description && (k.endsWith(':description') || k.endsWith(':subject'))) fields.description = clean;
    if (!fields.publisher && (k.endsWith(':publisher') || k.endsWith('producer') || k.endsWith('creatortool'))) fields.publisher = clean;
    if (!fields.publishedDate && (k.endsWith(':date') || k.endsWith('createdate') || k.endsWith('modifydate'))) fields.publishedDate = clean;
    if (!fields.isbn && k.includes('isbn')) fields.isbn = clean;
    if (!fields.language && k.endsWith(':language')) fields.language = clean;
  }
  return fields;
}

/**
 * Degrau 4 (heurística honesta): infere título/autor do texto/OCR da 1ª página.
 * Só preenche o que encontrar; não adivinha campos ausentes.
 */
export function inferMetadataFromFirstPage(pageText) {
  const lines = (pageText || '').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: '', author: '' };
  const authorLine = lines.find(l => /^(por|de|by)\s+\S+/i.test(l));
  const author = authorLine
    ? authorLine.replace(/^(por|de|by)\s+/i, '').split(/[,;\n]/)[0].slice(0, 60).trim()
    : '';
  let title = '';
  for (const line of lines.slice(0, 6)) {
    if (line.length < 3 || line.length > 90) continue;
    if (/^(por|de|by)\s/i.test(line)) continue;
    if (/^\d+$/.test(line) || /^página\s*\d+$/i.test(line)) continue;
    if (/[-—·]{4,}/.test(line)) continue;
    title = line;
    break;
  }
  return { title, author };
}
