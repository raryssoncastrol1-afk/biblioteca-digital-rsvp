import * as pdfjsLib from 'pdfjs-dist';
import { performOcrOnCanvas } from './ocrService.js';
import { extractChaptersFromSummary } from './pdfSummary.js';

// Configura o worker do PDF.js localmente (offline-first, sem CDN).
// O build (build.js) copia o worker para public/ durante a compilação.
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

export { applyXmpFallback, inferMetadataFromFirstPage } from './pdfMetadata.js';
import { applyXmpFallback, inferMetadataFromFirstPage } from './pdfMetadata.js';


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

    // Extrai o conteúdo de texto da página preservando quebras de linha reais e
    // descartando cabeçalhos e rodapés repetitivos / números de página em margens.
    const textContent = await page.getTextContent();
    const pageHeight = viewport.height;
    let pageText = '';
    let prevX = null;
    let prevY = null;

    // Filtra itens: ignora elementos nas bordas extremas que sejam apenas números isolados
    // (números de página no topo ou rodapé) ou cabeçalhos repetitivos
    const contentItems = [];
    for (const item of textContent.items) {
      if (!item.str) continue;
      const strTrim = item.str.trim();
      if (!strTrim) continue;

      const y = item.transform ? item.transform[5] : null;
      if (y !== null && pageHeight > 0) {
        const isExtremeMargin = y < pageHeight * 0.08 || y > pageHeight * 0.92;
        // Se estiver na margem extrema e for apenas um número (número de página)
        if (isExtremeMargin && /^\d{1,4}$/.test(strTrim)) {
          continue;
        }
      }
      contentItems.push(item);
    }

    for (const item of contentItems) {
      const x = item.transform ? item.transform[4] : null;
      const y = item.transform ? item.transform[5] : null;

      // Nova linha se: hasEOL marcado, OU o X retrocedeu significativamente, OU o Y desceu bastante
      const newLine = item.hasEOL === true ||
        (prevX !== null && x !== null && x < prevX - 8) ||
        (prevY !== null && y !== null && Math.abs(y - prevY) > 8);

      if (newLine && pageText) {
        // Garante que se o texto anterior terminar com caractere sem espaço, haja quebra com espaço seguro
        if (!pageText.endsWith('\n') && !pageText.endsWith(' ')) {
          pageText += '\n';
        }
      } else if (pageText && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        // Se estão na mesma linha mas distantes, insere espaço
        if (prevX !== null && x !== null && (x - prevX > 2)) {
          pageText += ' ';
        }
      }

      pageText += item.str;

      if (item.hasEOL === true && !pageText.endsWith('\n')) {
        pageText += '\n';
      }
      prevX = x ? x + (item.width || 0) : null;
      prevY = y;
    }

    // Normaliza quebras de linha e protege colisão de pontuação de final de frase com números (ex: "Deus.2." -> "Deus. 2.")
    pageText = pageText
      .replace(/([.!?])([0-9]+(?:\.[0-9]+)*)/g, '$1 $2')
      .replace(/\s*\n\s*/g, '\n')
      .trim();

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

  // Fallback final: se não tiver sumário nativo nem impresso, detecta seções/subtítulos no texto ou cria páginas lógicas
  if (chapters.length === 0) {
    const detectedHeadings = [];
    let runningWordOffset = 0;

    for (let pIdx = 0; pIdx < rawParagraphs.length; pIdx++) {
      const pText = rawParagraphs[pIdx] || '';
      const lines = pText.split('\n');
      let offsetInPage = 0;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        const lineWords = line.split(/\s+/).filter(Boolean);
        if (!line) continue;

        // Critérios para subtítulo/seção:
        // 1. Linha com comprimento razoável (< 90 caracteres)
        // 2. Inicia com marcadores clássicos: "Capítulo N", "Parte N", "Seção N", etc.
        // 3. OU numeração hierárquica (ex.: "2. Antropologia", "2.1. O Homem é Alma", "I. Introdução")
        // 4. OU termos canônicos (Introdução, Conclusão, Prefácio, etc.)
        const isHeading = line.length <= 90 && (
          /^cap[íi]tulo\b/i.test(line) ||
          /^parte\b/i.test(line) ||
          /^se[çc][ãa]o\b/i.test(line) ||
          /^\d+(\.\d+)*\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9]/.test(line) ||
          /^[IVXLCDM]+\.?\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(line) ||
          /^(sum[áa]rio|índice|introdu[çc][ãa]o|pref[áa]cio|conclus[ãa]o|ep[íi]logo|pr[óo]logo|anexo|ap[êe]ndice)/i.test(line)
        );

        if (isHeading) {
          const headingStart = runningWordOffset + offsetInPage;
          // Evita adicionar múltiplos subtítulos no exato mesmo offset ou excessivamente próximos (< 10 palavras)
          const lastHeading = detectedHeadings[detectedHeadings.length - 1];
          if (!lastHeading || (headingStart - lastHeading.startIndex >= 10)) {
            detectedHeadings.push({
              id: `pdf-detected-${detectedHeadings.length + 1}`,
              title: line.replace(/^#+\s*/, '').slice(0, 70),
              startIndex: headingStart,
              endIndex: words.length
            });
          }
        }

        offsetInPage += lineWords.length;
      }

      runningWordOffset += offsetInPage;
    }

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
