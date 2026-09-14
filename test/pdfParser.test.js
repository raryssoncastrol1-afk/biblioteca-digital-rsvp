import assert from 'assert';
import { extractChaptersFromSummary } from '../src/services/parsers/pdfSummary.js';

console.log('🧪 Testando extração de capítulos a partir do SUMÁRIO impresso do PDF...\n');

// Simula um PDF com capa (p1), sumário (p5) e capítulos nas páginas 7, 9, 13...
// pageWordOffsets: [0, 50, 100, 150, 200, ...]
const pageWordOffsets = Array.from({ length: 150 }, (_, i) => i * 50);
const numPages = 150;

// Página 4 (índice 4, física 5) = SUMÁRIO com o padrão real
const summaryPage = `SUMÁRIO
APRESENTAÇÃO .............. 7
PREFÁCIO ................. 9
CAPÍTULO 1 - POR QUE UMA SÉRIE DE LIVROS SOBRE O REDENTOR? ... 13
CAPÍTULO 2 - O REDENTOR NO CONSELHO DA REDENÇÃO ............ 27
CAPÍTULO 3 - O REDENTOR NO PACTO DA REDENÇÃO ............... 51
CAPÍTULO 4 - AS NATUREZAS DIVINA E HUMANA DO REDENTOR ....... 101`;

const rawParagraphs = Array.from({ length: 150 }, (_, i) => `Página ${i + 1} texto qualquer`);
rawParagraphs[4] = summaryPage;

const chapters = extractChaptersFromSummary(rawParagraphs, pageWordOffsets, numPages);

console.log('Capítulos extraídos:');
chapters.forEach((c, i) => console.log(`  ${i + 1}. ${c.title} → pág. física ${(c.startIndex / 50) + 1}, startIndex ${c.startIndex}`));

assert.strictEqual(chapters.length, 6, 'Deve extrair 6 entradas do sumário (APRESENTAÇÃO, PREFÁCIO, Capítulos 1-4)');
assert.strictEqual(chapters[0].title, 'APRESENTAÇÃO', 'Primeiro capítulo deve ser APRESENTAÇÃO');
assert.strictEqual(chapters[0].startIndex, 6 * 50, 'APRESENTAÇÃO (pág. impressa 7 → física 7, índice 6) deve usar offset 300');
assert.strictEqual(chapters[1].title, 'PREFÁCIO', 'Segundo capítulo deve ser PREFÁCIO');
assert.strictEqual(chapters[2].title, 'CAPÍTULO 1 - POR QUE UMA SÉRIE DE LIVROS SOBRE O REDENTOR?', 'Terceiro capítulo deve ser Capítulo 1');
assert.strictEqual(chapters[2].startIndex, 12 * 50, 'CAPÍTULO 1 (pág. impressa 13 → física 13, índice 12) deve usar offset 600');
assert.strictEqual(chapters[3].title, 'CAPÍTULO 2 - O REDENTOR NO CONSELHO DA REDENÇÃO', 'Quarto capítulo deve ser Capítulo 2');
assert.strictEqual(chapters[3].startIndex, 26 * 50, 'CAPÍTULO 2 (pág. impressa 27 → física 27, índice 26) deve usar offset 1300');

console.log('\n✔ Extração de sumário impresso validada com sucesso!');

// Teste 2: sumário com offset de numeração (página física 1 impressa como "7")
console.log('\nTestando sumário com offset de numeração...');
const rawParagraphs2 = Array.from({ length: 150 }, (_, i) => `Página ${i + 1} texto`);
const summaryPage2 = `ÍNDICE
INTRODUÇÃO .............. 3
CAPÍTULO 1 .............. 5
CAPÍTULO 2 .............. 9`;
rawParagraphs2[4] = summaryPage2;

const chapters2 = extractChaptersFromSummary(rawParagraphs2, pageWordOffsets, numPages);
console.log('Capítulos (offset normal):', chapters2.map(c => `${c.title}@${c.startIndex}`));
assert.strictEqual(chapters2.length, 3, 'Deve extrair 3 entradas');
assert.strictEqual(chapters2[0].startIndex, 2 * 50, 'INTRODUÇÃO (impressa 3 → física 3, índice 2) deve usar offset 100');
assert.strictEqual(chapters2[2].startIndex, 8 * 50, 'CAPÍTULO 2 (impressa 9 → física 9, índice 8) deve usar offset 400');

console.log('\n✔ Testes de extração de sumário impresso passaram!');