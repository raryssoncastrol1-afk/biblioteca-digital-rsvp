import assert from 'assert';
import { parseTxtFile } from '../src/services/parsers/txtParser.js';
import { generateDynamicCover } from '../src/services/parsers/coverGenerator.js';

console.log('🧪 Iniciando testes de Parsers, Metadados e Índices...\n');

// 1. Teste de Parse de TXT com Frontmatter YAML e Cabeçalhos
console.log('Testando parseTxtFile com metadados e capítulos...');

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
