import assert from 'assert';
import { parseTxtFile } from '../src/services/parsers/txtParser.js';
import { generateDynamicCover } from '../src/services/parsers/coverGenerator.js';

console.log('🧪 Iniciando testes de Parsers, Metadados e Índices...\n');

// 0. Teste de Detecção de Subseções Numéricas (X.Y) e Capítulos com marcadores variados
console.log('Testando detecção de subseções numéricas e capítulos com marcadores variados...');

const sampleNumbered = [
  '1. Introdução',
  'Texto introdutório com várias palavras para testar.',
  '',
  '1.1. Contexto Histórico',
  'Texto do contexto com mais palavras aqui.',
  '',
  '2. Desenvolvimento',
  'Texto do desenvolvimento.',
  '',
  '2.1 Detalhes do Meio',
  'Detalhes do meio do livro.',
].join('\n');

const numberedFile = {
  name: 'numerado.txt',
  text: async () => sampleNumbered
};

parseTxtFile(numberedFile).then(parsedNum => {
  const titles = parsedNum.chapters.map(c => c.title);
  assert(titles.includes('1. Introdução'), 'Capítulo principal "1. Introdução" deve ser detectado');
  assert(titles.includes('1.1. Contexto Histórico'), 'Subseção "1.1. Contexto Histórico" deve ser detectada');
  assert(titles.includes('2. Desenvolvimento'), 'Capítulo "2. Desenvolvimento" deve ser detectado');
  assert(titles.includes('2.1 Detalhes do Meio'), 'Subseção "2.1 Detalhes do Meio" deve ser detectada');

  for (let i = 0; i < parsedNum.chapters.length; i++) {
    const ch = parsedNum.chapters[i];
    assert(ch.startIndex >= 0, 'startIndex deve ser >= 0');
    assert(ch.endIndex >= ch.startIndex, 'endIndex deve ser >= startIndex');
    if (i < parsedNum.chapters.length - 1) {
      assert.strictEqual(ch.endIndex, parsedNum.chapters[i + 1].startIndex, 'Capítulo deve cobrir até o próximo');
    }
  }
  console.log('✔ Subseções numéricas e capítulos com marcadores variados detectados.');
  console.log(`  Títulos obtidos: ${titles.join(' | ')}`);
}).catch(err => {
  console.error('❌ Falha no teste de subseções:', err);
  process.exit(1);
});

// 1. Teste de Parse de TXT com Frontmatter YAML e Cabeçalhos
console.log('\nTestando parseTxtFile com metadados e capítulos...');

const sampleMarkdown = `---
title: "Memórias Póstumas de Brás Cubas"
author: "Machado de Assis"
description: "Obra de ficção inauguradora do Realismo no Brasil."
---

# Ao Leitor
Que Stendhal confessasse haver escrito um de seus livros para cem leitores, cousa é que se compreende.

# Capítulo 1 - Óbito do Autor
Algum tempo hesitei se devia abrir estas memórias pelo princípio ou pelo fim.

# Capítulo 2 - O Emplasto
Com efeito, a ideia de inventar um medicamento sublime veio-me naquele instante.
`;

const fakeFile = {
  name: 'bras_cubas.md',
  text: async () => sampleMarkdown
};

parseTxtFile(fakeFile).then(parsed => {
  assert.strictEqual(parsed.title, "Memórias Póstumas de Brás Cubas", "Título extraído do frontmatter deve coincidir");
  assert.strictEqual(parsed.author, "Machado de Assis", "Autor extraído do frontmatter deve coincidir");
  assert.strictEqual(parsed.description, "Obra de ficção inauguradora do Realismo no Brasil.", "Descrição do frontmatter deve coincidir");
  assert.strictEqual(parsed.format, "MD", "Formato deve ser MD");
  assert(parsed.words.length > 30, "Deve ter tokens extraídos");
  assert(parsed.chapters.length >= 3, `Deve identificar capítulos (obtido: ${parsed.chapters.length})`);
  assert.strictEqual(parsed.chapters[0].title, "Ao Leitor", "Primeiro capítulo deve ser 'Ao Leitor'");
  assert.strictEqual(parsed.chapters[1].title, "Capítulo 1 - Óbito do Autor", "Segundo capítulo correto");

  // Validar integridade dos índices de início e fim dos capítulos
  for (let i = 0; i < parsed.chapters.length; i++) {
    const ch = parsed.chapters[i];
    assert(ch.startIndex >= 0, "startIndex deve ser >= 0");
    assert(ch.endIndex >= ch.startIndex, "endIndex deve ser >= startIndex");
    if (i < parsed.chapters.length - 1) {
      assert.strictEqual(ch.endIndex, parsed.chapters[i + 1].startIndex, "Capítulo deve cobrir até o próximo");
    }
  }

  console.log('✔ Extração de metadados e índice do TXT/MD validada com sucesso.');

  console.log('\n🎉 TODOS OS TESTES DE PARSERS PASSARAM!');
}).catch(err => {
  console.error('❌ Falha nos testes de parser:', err);
  process.exit(1);
});