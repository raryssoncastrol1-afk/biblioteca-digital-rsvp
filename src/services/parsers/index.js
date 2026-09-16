import { parseTxtFile } from './txtParser.js';
import { parseEpubFile } from './epubParser.js';
import { parsePdfFile } from './pdfParser.js';
import { parseDocxFile } from './docxParser.js';
import { parseMobiFile } from './mobiParser.js';
import { generateDynamicCover } from './coverGenerator.js';
import { enrichBookMetadata } from '../metadataEnricher.js';
import { parseMetadataFromFilename } from './filenamePatterns.js';

/**
 * Parser unificado para múltiplos formatos de documentos com enriquecimento de metadados,
 * extração de índice (TOC) e geração de capas.
 * 
 * Cascata de metadados (o primeiro degrau que desbloquear o campo vence):
 *   1. Nativos do formato (OPF / Info+XMP / EXTH)
 *   2. Filename (Autor - Título (Ano), ISBN)
 *   3. OCR da 1ª página (PDF escaneado, dentro de parsePdfFile)
 *   4. Open Library (enriquecimento: capa/editora/descrição)
 *   5. Capa dinâmica Canvas
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
      result = await parseMobiFile(file);
      break;

    default:
      result = await parseTxtFile(file);
      break;
  }

  // Degrau 2: filename — preenche só quando o nativo não resolveu
  const baseName = file.name.replace(/\.[^/.]+$/, "").trim();
  const fromName = parseMetadataFromFilename(file.name);
  if ((!result.author || result.author === 'Autor Desconhecido') && fromName.author) {
    result.author = fromName.author;
  }
  if (result.title === baseName && fromName.title) {
    result.title = fromName.title;
  }
  if (!result.isbn && fromName.isbn) {
    result.isbn = fromName.isbn;
  }
  if (!result.publishedDate && fromName.year) {
    result.publishedDate = fromName.year;
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
