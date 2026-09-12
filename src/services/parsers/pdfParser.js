import * as pdfjsLib from 'pdfjs-dist';
import { performOcrOnCanvas } from './ocrService.js';

// Configura o worker do PDF.js localmente (offline-first, sem CDN).
// O build (build.js) copia o worker para public/ durante a compilação.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
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

    // Extrai o conteúdo de texto da página
    const textContent = await page.getTextContent();
    let pageText = textContent.items.map(item => item.str).join(' ').trim();

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

  // Extrai metadados do documento PDF
  let title = file.name.replace(/\.[^/.]+$/, "");
  let author = "Autor Desconhecido";
  let description = "";
  let publisher = "";
  let publishedDate = "";

  try {
    const metadata = await pdfDoc.getMetadata();
    const info = metadata?.info || {};
    if (info.Title && info.Title.trim() && !info.Title.toLowerCase().startsWith('untitled')) {
      title = info.Title.trim();
    }
    if (info.Author && info.Author.trim()) {
      author = info.Author.trim();
    }
    if (info.Subject && info.Subject.trim()) {
      description = info.Subject.trim();
    }
    if (info.Producer || info.Creator) {
      publisher = info.Producer || info.Creator || '';
    }
    if (info.CreationDate) {
      publishedDate = String(info.CreationDate);
    }
  } catch (err) {
    console.warn('Erro ao ler metadados do PDF:', err);
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

  // Fallback: se não tiver sumário nativo, detecta seções ou cria páginas lógicas
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
