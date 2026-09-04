import { parseTxtFile } from './txtParser.js';
import { parseEpubFile } from './epubParser.js';
import { parsePdfFile } from './pdfParser.js';
import { parseDocxFile } from './docxParser.js';
import { generateDynamicCover } from './coverGenerator.js';
import { enrichBookMetadata } from '../metadataEnricher.js';

/**
 * Parser unificado para múltiplos formatos de documentos com enriquecimento de metadados,
 * extração de índice (TOC) e geração de capas.
 * 
 * @param {File} file 
 * @param {Function} [onProgress]
 */
export async function parseDocument(file, onProgress) {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  let result;

  switch (ext) {
    case 'txt':
    case 'md':
      result = await parseTxtFile(file);
      break;

    case 'epub':
      result = await parseEpubFile(file);
      break;

    case 'pdf':
      result = await parsePdfFile(file, onProgress);
      break;

    case 'docx':
      result = await parseDocxFile(file);
      break;

    case 'mobi':
    case 'azw3':
      result = await parseMobiFallback(file);
      break;

    default:
      result = await parseTxtFile(file);
      break;
  }

  // 1. Tentar enriquecer metadados e capa online via Open Library se a capa não foi embutida ou faltam metadados
  if (!result.coverDataUrl || result.author === 'Autor Desconhecido' || !result.description) {
    try {
      const enriched = await enrichBookMetadata({
        title: result.title,
        author: result.author,
        isbn: result.isbn
      });

      if (enriched) {
        if (!result.coverDataUrl && enriched.coverDataUrl) {
          result.coverDataUrl = enriched.coverDataUrl;
        }
        if ((!result.author || result.author === 'Autor Desconhecido') && enriched.enrichedAuthor) {
          result.author = enriched.enrichedAuthor;
        }
        if (!result.publisher && enriched.publisher) {
          result.publisher = enriched.publisher;
        }
        if (!result.publishedDate && enriched.publishYear) {
          result.publishedDate = String(enriched.publishYear);
        }
        if (!result.language && enriched.language) {
          result.language = enriched.language;
        }
        if (enriched.subjects && enriched.subjects.length > 0) {
          result.subjects = enriched.subjects;
        }
      }
    } catch (err) {
      console.warn('Enriquecimento online ignorado:', err);
    }
  }

  // 2. Se ainda assim não possuir capa, gerar capa artística dinâmica usando Canvas
  if (!result.coverDataUrl) {
    result.coverDataUrl = generateDynamicCover(result.title, result.author, result.format);
  }

  return result;
}

/**
 * Leitura de fallback para formatos de ebook binários (MOBI / AZW3)
 */
async function parseMobiFallback(file) {
  const buffer = await file.arrayBuffer();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const text = decoder.decode(buffer);

  // Extrai trechos de texto legíveis ASCII / Latin / UTF-8
  const cleanStrings = text.match(/[\w\s.,;:!?áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ"'\-–—]{4,}/g) || [];
  const fullText = cleanStrings.join(' ');
  const words = fullText.split(/\s+/).filter(w => w.length > 0 && !/[^\x20-\x7E\xC0-\xFF]/.test(w));

  return {
    title: file.name.replace(/\.[^/.]+$/, ""),
    author: "Autor Desconhecido",
    format: file.name.split('.').pop()?.toUpperCase() || 'MOBI',
    totalWords: words.length,
    words,
    rawText: fullText,
    chapters: [{
      id: "mobi-ch-1",
      title: "Documento MOBI",
      startIndex: 0,
      endIndex: words.length
    }]
  };
}
