import * as pdfjsLib from 'pdfjs-dist';
import { performOcrOnCanvas } from './ocrService.js';
import { extractChaptersFromSummary } from './pdfSummary.js';

// Configura o worker do PDF.js localmente (offline-first, sem CDN).
// O build (build.js) copia o worker para public/ durante a compilação.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

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
 * ponytail: heurística simples — capa escaneada ilegível retorna vazio (sem false positives
 * de autor). Upgrade: OCR de página inteira + NER local, se a taxa de erro incomodar.
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

/**
 * Resolve o número da página de um destino de outline/marcador do PDF
 */
async function resolveDestinationPage(pdfDoc, dest) {
  try {
    let explicitDest = dest;
    if (typeof dest === 'string') {
      explicitDest = await pdfDoc.getDestination(dest);
    }
    if (Array.isArray(explicitDest) && explicitDest.length > 0) {
      const destRef = explicitDest[0];
      if (typeof destRef === 'object' && destRef !== null) {
        const pageIndex = await pdfDoc.getPageIndex(destRef);
        return pageIndex + 1; // 1-indexed
      } else if (typeof destRef === 'number') {
        return destRef + 1;
      }
    }
  } catch (e) {
    console.warn('Não foi possível resolver destino de página do PDF:', e);
  }
  return null;
}

/**
 * Parser avançado para arquivos PDF com suporte a OCR, extração de Outline/Sumário nativo e capa em alta fidelidade.
 * 
 * @param {File} file 
 * @param {Function} [onProgress] - Callback com porcentagem de processamento
 */
export async function parsePdfFile(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: '/pdf-cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdf-standard-fonts/'
  });
  const pdfDoc = await loadingTask.promise;

  const numPages = pdfDoc.numPages;
  const words = [];
  const rawParagraphs = [];
  const pageWordOffsets = []; // 0-indexed page index -> start word index
  let currentWordOffset = 0;
  let coverDataUrl = null;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 90));
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    // Gera thumbnail/capa em alta resolução a partir da primeira página
    if (pageNum === 1 && typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const coverViewport = page.getViewport({ scale: 2.0 }); // alta nitidez
        canvas.height = coverViewport.height;
        canvas.width = coverViewport.width;

        await page.render({ canvasContext: context, viewport: coverViewport }).promise;
        coverDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      } catch (err) {
        console.warn('Erro ao gerar capa do PDF:', err);
      }
    }

    // Registra o offset inicial desta página
    pageWordOffsets.push(currentWordOffset);

    // Extrai o conteúdo de texto da página preservando quebras de linha reais.
    // Estratégia dupla: usa item.hasEOL quando disponível; além disso, detecta
    // quebra de linha pela posição X (quando o item volta para a esquerda, é nova linha).
    const textContent = await page.getTextContent();
    let pageText = '';
    let prevX = null;
    for (const item of textContent.items) {
      if (!item.str) continue;
      const x = item.transform ? item.transform[4] : null;
      // Nova linha se: hasEOL marcado, OU o X retrocedeu significativamente
      const newLine = item.hasEOL === true ||
        (prevX !== null && x !== null && x < prevX - 5);
      if (pageText && newLine) pageText += '\n';
      pageText += item.str;
      if (item.hasEOL === true) pageText += '\n';
      prevX = x;
    }
    pageText = pageText.replace(/\s*\n\s*/g, '\n').trim();

    // Se a página tiver quase nenhum texto, tenta OCR via Tesseract WASM
    if (pageText.length < 15 && typeof document !== 'undefined') {
      try {
        const ocrCanvas = document.createElement('canvas');
        const ctx = ocrCanvas.getContext('2d');
        ocrCanvas.height = viewport.height;
        ocrCanvas.width = viewport.width;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const ocrText = await performOcrOnCanvas(ocrCanvas);
        if (ocrText && ocrText.trim().length > pageText.length) {
          pageText = ocrText.trim();
        }
      } catch (ocrErr) {
        console.warn(`OCR falhou na página ${pageNum}:`, ocrErr);
      }
    }

    if (pageText) {
      const pageWords = pageText.split(/\s+/).filter(Boolean);
      if (pageWords.length > 0) {
        words.push(...pageWords);
        rawParagraphs.push(pageText);
        currentWordOffset += pageWords.length;
      }
    }
  }

  // Extrai metadados do documento PDF (Info dictionary + fallback XMP + OCR da 1ª página)
  let title = file.name.replace(/\.[^/.]+$/, "");
  let author = "Autor Desconhecido";
  let description = "";
  let publisher = "";
  let publishedDate = "";
  let isbn = '';
  let language = '';

  try {
    const metadata = await pdfDoc.getMetadata();
    const info = metadata?.info || {};
    const fields = {
      title: '', author: '', description: '', publisher: '', publishedDate: '', isbn: '', language: ''
    };
    if (info.Title && info.Title.trim() && !info.Title.toLowerCase().startsWith('untitled')) {
      fields.title = info.Title.trim();
    }
    if (info.Author && info.Author.trim()) fields.author = info.Author.trim();
    if (info.Subject && info.Subject.trim()) fields.description = info.Subject.trim();
    if ((info.Producer || info.Creator) && !fields.publisher) fields.publisher = info.Producer || info.Creator;
    if (info.CreationDate) fields.publishedDate = String(info.CreationDate);
    if (info.ISBN) fields.isbn = String(info.ISBN).trim();

    // Fallback XMP: recupera metadados originais quando o Info vier quebrado/vazio
    if (metadata?.metadata && typeof metadata.metadata.getAll === 'function') {
      applyXmpFallback(fields, metadata.metadata.getAll());
    }

    title = fields.title || title;
    author = fields.author || author;
    description = fields.description || description;
    publisher = fields.publisher || publisher;
    publishedDate = fields.publishedDate || publishedDate;
    isbn = fields.isbn || isbn;
    language = fields.language || language;
  } catch (err) {
    console.warn('Erro ao ler metadados do PDF:', err);
  }

  // Degrau 4: PDF escaneado (Info/XMP ausentes) — infere título/autor do texto/OCR da 1ª página
  if ((title === file.name.replace(/\.[^/.]+$/, "") || author === 'Autor Desconhecido') && rawParagraphs[0]) {
    const inferred = inferMetadataFromFirstPage(rawParagraphs[0]);
    if (title === file.name.replace(/\.[^/.]+$/, "") && inferred.title) title = inferred.title;
    if (author === 'Autor Desconhecido' && inferred.author) author = inferred.author;
  }

  // 4. Extrair o Índice (Outline / Bookmarks)
  let chapters = [];
  try {
    const outline = await pdfDoc.getOutline();
    if (outline && outline.length > 0) {
      // Processa a árvore de marcadores de forma recursiva
      async function processOutlineNode(nodes) {
        const list = [];
        for (const item of nodes) {
          if (item.dest) {
            const targetPage = await resolveDestinationPage(pdfDoc, item.dest);
            if (targetPage && targetPage <= numPages) {
              const startIdx = pageWordOffsets[targetPage - 1] ?? 0;
              list.push({
                title: item.title?.trim() || `Seção (Pág. ${targetPage})`,
                page: targetPage,
                startIndex: startIdx
              });
            }
          }
          if (item.items && item.items.length > 0) {
            const children = await processOutlineNode(item.items);
            list.push(...children);
          }
        }
        return list;
      }

      const outlineChapters = await processOutlineNode(outline);
      if (outlineChapters.length > 0) {
        // Ordena por índice de palavra
        outlineChapters.sort((a, b) => a.startIndex - b.startIndex);

        // Remove duplicados no mesmo offset
        const unique = [];
        const seen = new Set();
        outlineChapters.forEach((ch, idx) => {
          if (!seen.has(ch.startIndex)) {
            seen.add(ch.startIndex);
            unique.push({
              id: `pdf-outline-${idx + 1}`,
              title: ch.title.slice(0, 80),
              startIndex: ch.startIndex,
              endIndex: words.length
            });
          }
        });

        // Ajusta endIndex
        for (let i = 0; i < unique.length; i++) {
          if (i < unique.length - 1) {
            unique[i].endIndex = unique[i + 1].startIndex;
          } else {
            unique[i].endIndex = words.length;
          }
        }

        chapters = unique;
      }
    }
  } catch (outlineErr) {
    console.warn('Não foi possível ler sumário nativo do PDF:', outlineErr);
  }

  // Fallback: se não tiver sumário nativo, tenta extrair o SUMÁRIO impresso (página de "Sumário"/"Índice")
  if (chapters.length === 0) {
    try {
      const summaryChapters = extractChaptersFromSummary(rawParagraphs, pageWordOffsets, numPages);
      if (summaryChapters.length > 0) {
        // Ajusta endIndex para cada capítulo (até o próximo início)
        for (let i = 0; i < summaryChapters.length; i++) {
          summaryChapters[i].id = `pdf-summary-${i + 1}`;
          summaryChapters[i].endIndex =
            i < summaryChapters.length - 1 ? summaryChapters[i + 1].startIndex : words.length;
        }
        chapters = summaryChapters;
      }
    } catch (summaryErr) {
      console.warn('Não foi possível extrair sumário impresso do PDF:', summaryErr);
    }
  }

  // Fallback final: se não tiver sumário nativo nem impresso, detecta seções ou cria páginas lógicas
  if (chapters.length === 0) {
    // Detecta capítulos por regex no texto de cada página
    const detectedHeadings = [];
    pageWordOffsets.forEach((offset, pIdx) => {
      const pNum = pIdx + 1;
      const pText = rawParagraphs[pIdx] || '';
      
      // Procura padrões como "Capítulo 1", "CAPÍTULO I", "PARTE 1", "Sumário", etc.
      const match = pText.match(/^(cap[íi]tulo\s+[0-9ivxlcdm]+|parte\s+[0-9ivxlcdm]+|seção\s+[0-9]+|introdução|prefácio|conclusão|sumário|índice)/im);
      if (match) {
        detectedHeadings.push({
          id: `pdf-detected-${detectedHeadings.length + 1}`,
          title: match[0].slice(0, 60),
          startIndex: offset,
          endIndex: words.length
        });
      }
    });

    if (detectedHeadings.length >= 2) {
      for (let i = 0; i < detectedHeadings.length; i++) {
        if (i < detectedHeadings.length - 1) {
          detectedHeadings[i].endIndex = detectedHeadings[i + 1].startIndex;
        } else {
          detectedHeadings[i].endIndex = words.length;
        }
      }
      chapters = detectedHeadings;
    } else {
      // Cria capítulos por páginas ou blocos de páginas
      chapters = pageWordOffsets.map((offset, idx) => {
        const nextOffset = idx < pageWordOffsets.length - 1 ? pageWordOffsets[idx + 1] : words.length;
        return {
          id: `pdf-page-${idx + 1}`,
          title: `Página ${idx + 1}`,
          startIndex: offset,
          endIndex: nextOffset
        };
      }).filter(ch => ch.endIndex > ch.startIndex);
    }
  }

  return {
    title,
    author,
    description,
    publisher,
    publishedDate,
    isbn,
    language,
    format: "PDF",
    totalWords: words.length,
    words,
    rawText: rawParagraphs.join('\n\n'),
    coverDataUrl,
    chapters: chapters.length > 0 ? chapters : [{
      id: "pdf-ch-1",
      title: "Documento Completo",
      startIndex: 0,
      endIndex: words.length
    }]
  };
}
