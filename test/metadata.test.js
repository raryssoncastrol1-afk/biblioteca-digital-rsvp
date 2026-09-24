import assert from 'assert';
import { extractMobiHeader, parseMobiFile } from '../src/services/parsers/mobiParser.js';
import { parseMetadataFromFilename } from '../src/services/parsers/filenamePatterns.js';
import { applyXmpFallback, inferMetadataFromFirstPage } from '../src/services/parsers/pdfMetadata.js';

console.log('🧪 Iniciando testes da cascata de metadados (filename / MOBI / XMP / OCR)...\n');

// ── Helper: monta um .mobi sintético em memória (PalmDB + MOBI header + EXTH) ──
function buildSyntheticMobi({ title, author, isbn }) {
  const enc = s => new TextEncoder().encode(s);
  const titleBytes = enc(title);
  const mobiLen = 0xE8;
  const records = [];
  if (author) records.push([100, enc(author)]);
  if (isbn) records.push([104, enc(isbn)]);
  const exthLen = 12 + records.reduce((acc, [, b]) => acc + 8 + b.length, 0);
  const titleOff = 16 + mobiLen + exthLen;
  const rec0off = 86;
  const textBytes = enc('Dom Casmurro narra a vida do protagonista homônimo em forma de memórias póstumas.');
  const size = rec0off + titleOff + titleBytes.length + 1 + textBytes.length;
  const buf = new Uint8Array(size);
  const dv = new DataView(buf.buffer);

  // PalmDB header
  buf.set(enc('BOOKMOBI'), 60);
  dv.setUint16(76, 1, false);          // numRecords
  dv.setUint32(78, rec0off, false);    // record 0 data offset

  // MOBI header (dentro do record 0)
  buf.set(enc('MOBI'), rec0off);
  dv.setUint32(rec0off + 4, mobiLen, false);
  dv.setUint32(rec0off + 0x44, titleOff, false);      // Full Name offset (relativo ao record 0)
  dv.setUint32(rec0off + 0x48, titleBytes.length, false); // Full Name length
  dv.setUint32(rec0off + 0x70, 0x40, false);          // EXTH flag (bit 6)

  // EXTH block (logo após PalmDOC 16 bytes + MOBI header)
  const ex = rec0off + 16 + mobiLen;
  buf.set(enc('EXTH'), ex);
  dv.setUint32(ex + 4, exthLen, false);
  dv.setUint32(ex + 8, records.length, false);
  let p = ex + 12;
  for (const [type, payload] of records) {
    dv.setUint32(p, type, false);
    dv.setUint32(p + 4, 8 + payload.length, false);
    buf.set(payload, p + 8);
    p += 8 + payload.length;
  }

  // Título (full name) + texto final
  buf.set(titleBytes, rec0off + titleOff);
  buf.set(textBytes, rec0off + titleOff + titleBytes.length + 1);
  return buf;
}

// ── Degrau 3: filename ──
console.log('Testando parseMetadataFromFilename...');
let r = parseMetadataFromFilename('Machado de Assis - Dom Casmurro (1899).pdf');
assert.strictEqual(r.author, 'Machado de Assis', 'Autor deve vir antes do " - "');
assert.strictEqual(r.title, 'Dom Casmurro', 'Título após o separador');
assert.strictEqual(r.year, '1899', 'Ano entre parênteses');
r = parseMetadataFromFilename('Dom Casmurro (ISBN 978-85-7322-0007).epub');
assert.strictEqual(r.title, 'Dom Casmurro', 'Tag ISBN removida do título');
assert.strictEqual(r.isbn, '9788573220007', 'ISBN normalizado para dígitos');
console.log('✔ Filename OK');

// ── Degrau 1 (MOBI): header real ──
console.log('Testando extractMobiHeader com MOBI sintético...');
const mobiBuf = buildSyntheticMobi({ title: 'Dom Casmurro', author: 'Machado de Assis', isbn: '9788572320007' });
const hdr = extractMobiHeader(mobiBuf);
assert.strictEqual(hdr.valid, true, 'Header MOBI deve ser reconhecido');
assert.strictEqual(hdr.title, 'Dom Casmurro', 'Título do Full Name header');
assert.strictEqual(hdr.author, 'Machado de Assis', 'Autor do record EXTH 100');
assert.strictEqual(hdr.isbn, '9788572320007', 'ISBN do record EXTH 104');
console.log('✔ MOBI header OK');

console.log('Testando parseMobiFile (shape completo)...');
const mobiFile = { name: 'dom_casmurro.mobi', arrayBuffer: async () => mobiBuf.slice().buffer };
const mobi = await parseMobiFile(mobiFile);
assert.strictEqual(mobi.title, 'Dom Casmurro', 'parseMobiFile projeta o título do header');
assert.strictEqual(mobi.author, 'Machado de Assis', 'parseMobiFile projeta o autor do EXTH');
assert.strictEqual(mobi.isbn, '9788572320007', 'parseMobiFile projeta o ISBN');
assert.strictEqual(mobi.format, 'MOBI', 'Formato correto');
assert(mobi.words.length > 5, 'Deve extrair palavras para o leitor');
assert.strictEqual(mobi.chapters.length, 1, 'Documento único');
console.log('✔ parseMobiFile OK');

// ── Degrau 1 (PDF): fallback XMP ──
console.log('Testando applyXmpFallback (XMP só cobre lacunas)...');
const base = { title: '', author: '', publisher: '', description: '', isbn: '', language: '', publishedDate: '' };
const filled = applyXmpFallback({ ...base }, {
  'dc:title': 'Dom Casmurro',
  'dc:creator': ['Machado de Assis'],
  'pdf:Producer': 'Writer',
  'dc:language': ['pt-BR']
});
assert.strictEqual(filled.title, 'Dom Casmurro', 'XMP dc:title preenche título');
assert.strictEqual(filled.author, 'Machado de Assis', 'XMP dc:creator (array) preenche autor');
assert.strictEqual(filled.publisher, 'Writer', 'XMP pdf:Producer preenche editora');
assert.strictEqual(filled.language, 'pt-BR', 'XMP dc:language preenche idioma');

const kept = applyXmpFallback({ ...base, title: 'Info Dictionary Title' }, { 'dc:title': 'XMP Suplantou' });
assert.strictEqual(kept.title, 'Info Dictionary Title', 'Info tem prioridade sobre XMP');
console.log('✔ XMP OK');

// ── Degrau 4: inferência OCR da 1ª página ──
console.log('Testando inferMetadataFromFirstPage...');
const pg1 = 'Dom Casmurro\npor Machado de Assis\nCAPÍTULO PRIMEIRO\nAlgum tempo hesitei se devia abrir estas memórias.';
const inferred = inferMetadataFromFirstPage(pg1);
assert.strictEqual(inferred.title, 'Dom Casmurro', 'Título = 1ª linha curta');
assert.strictEqual(inferred.author, 'Machado de Assis', 'Autor = linha após "por"');
const empty = inferMetadataFromFirstPage('');
assert.strictEqual(empty.author, '', 'Sem texto → sem inferência (sem false positive)');
console.log('✔ Inferência OCR OK');

console.log('\n🎉 TODOS OS TESTES DA CASCATA DE METADADOS PASSARAM!');