/**
 * Parser de MOBI / AZW3 com leitura real do header (PalmDB + MOBI + EXTH).
 * Recupera title, author (EXTH 100), publisher (101), description (103),
 * isbn (104), subject (105), language (524) — determinístico, sem IA.
 */

function u16(buf, off) {
  return ((buf[off] << 8) | buf[off + 1]) >>> 0;
}

function u32(buf, off) {
  return ((buf[off] << 24) | (buf[off + 1] << 16) | (buf[off + 2] << 8) | buf[off + 3]) >>> 0;
}

function asciiAt(buf, off, str) {
  if (off + str.length > buf.length) return false;
  for (let i = 0; i < str.length; i++) {
    if (buf[off + i] !== str.charCodeAt(i)) return false;
  }
  return true;
}

function decodeText(slice) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(slice);
  } catch (err) {
    return new TextDecoder('latin1').decode(slice);
  }
}

/**
 * Extrai os campos do header MOBI a partir do buffer completo do arquivo.
 * Retorna os campos encontrados + flag se o header foi reconhecido.
 */
export function extractMobiHeader(buffer) {
  const out = { title: '', author: '', publisher: '', description: '', isbn: '', language: '', subjects: [], valid: false };

  // 1. Localiza 'BOOKMOBI' no cabeçalho PalmDB (tradicionalmente em offset 60)
  let bookIndex = -1;
  for (let i = 0; i <= 74; i++) {
    if (buffer[i] === 0x42 && buffer[i + 1] === 0x4f && buffer[i + 2] === 0x4f &&
        buffer[i + 3] === 0x4b && buffer[i + 4] === 0x4d && buffer[i + 5] === 0x4f &&
        buffer[i + 6] === 0x42 && buffer[i + 7] === 0x49) {
      bookIndex = i;
      break;
    }
  }
  if (bookIndex === -1) return out;

  // 2. Offset do record 0 (primeira entrada da tabela de records, a partir de 78)
  const rec0off = u32(buffer, 78);
  if (rec0off + 4 > buffer.length) return out;

  // 3. Cabeçalho MOBI dentro do record 0
  const mobiLen = u32(buffer, rec0off + 4);
  const exthFlags = u32(buffer, rec0off + 0x70);
  const titleOff = u32(buffer, rec0off + 0x44);
  const titleLen = u32(buffer, rec0off + 0x48);
  const textStart = rec0off + 16 + mobiLen;

  // 4. Título: campo "Full Name" do header (offset relativo ao início do record 0)
  let titlePos = titleOff && titleOff < buffer.length ? rec0off + titleOff : textStart;
  const tLen = titleLen > 0 && titleLen < 200 ? titleLen : 0;
  if (titlePos < buffer.length) {
    const end = Math.min(titlePos + (tLen || 200), buffer.length);
    out.title = decodeText(buffer.subarray(titlePos, end)).split('\0')[0].trim();
  }

  // 5. Records EXTH (metadados estendidos): flag da MOBI header = bit 6 (0x40)
  if ((exthFlags & 0x40) !== 0 && textStart + 4 <= buffer.length && asciiAt(buffer, textStart, 'EXTH')) {
    const exthLen = u32(buffer, textStart + 4);
    const end = Math.min(textStart + exthLen, buffer.length);
    let pos = textStart + 12;
    while (pos + 8 <= end) {
      if (u32(buffer, pos) === 0) { pos += 4; continue; }
      const type = u32(buffer, pos);
      const len = u32(buffer, pos + 4);
      if (len < 8 || pos + len > end) break;
      const value = decodeText(buffer.subarray(pos + 8, pos + len)).replace(/\0/g, '').trim();
      switch (type) {
        case 100: if (!out.author && value) out.author = value; break;
        case 101: if (!out.publisher && value) out.publisher = value; break;
        case 103: if (!out.description && value) out.description = value; break;
        case 104: if (!out.isbn && value) out.isbn = value; break;
        case 105: if (value) out.subjects.push(value); break;
        case 524: if (!out.language && value) out.language = value; break;
        case 503: if (!out.title && value) out.title = value; break;
      }
      pos += len;
    }
  }

  out.valid = true;
  return out;
}

/**
 * Parser unificado de arquivos MOBI/AZW3.
 * Mantém o mesmo shape do fallback anterior; header inválido → comportamento antigo.
 *
 * ponytail: não descomprime o texto (LZ77/Huffman) — para livros comprimidos os "words"
 * continuam com ruído binário, mesmo comportamento do fallback legado. Upgrade: descompressão
 * LZ77 local (~100 linhas) quando a leitura de MOBI comprimido importar de verdade.
 */
export async function parseMobiFile(file) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const header = extractMobiHeader(buffer);

  let title = header.title || file.name.replace(/\.[^/.]+$/, "");
  let author = header.author || 'Autor Desconhecido';

  // Texto bruto para o leitor (mesma abordagem do fallback legado)
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const fullText = decoder.decode(buffer);
  const cleanStrings = fullText.match(/[\w\s.,;:!?áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ"'\-–—]{4,}/g) || [];
  const text = cleanStrings.join(' ');
  const words = text.split(/\s+/).filter(w => w.length > 0 && !/[^\x20-\x7E\xC0-\xFF]/.test(w));

  return {
    title,
    author,
    publisher: header.publisher,
    description: header.description,
    isbn: header.isbn,
    language: header.language,
    subjects: header.subjects,
    format: (file.name.split('.').pop() || 'MOBI').toUpperCase(),
    totalWords: words.length,
    words,
    rawText: text,
    chapters: [{
      id: "mobi-ch-1",
      title: "Documento MOBI",
      startIndex: 0,
      endIndex: words.length
    }]
  };
}