import assert from 'assert';
import { calculateORP, calculateDwellTime } from '../src/engine/orp.js';

console.log('🧪 Iniciando testes do Motor RSVP e Algoritmos Cognitivos...\n');

// 1. Teste de Cálculo ORP
console.log('Testando calculateORP...');
const testCases = [
  { word: 'a', expectedFocal: 0 },
  { word: 'em', expectedFocal: 0 },
  { word: 'sol', expectedFocal: 0 },
  { word: 'livro', expectedFocal: 1 },       // len 5 -> floor(4/3) = 1
  { word: 'biblioteca', expectedFocal: 3 },  // len 10 -> floor(9/3) = 3
  { word: 'desenvolvimento', expectedFocal: 4 } // len 15 -> floor(14/3) = 4
];

testCases.forEach(({ word, expectedFocal }) => {
  const res = calculateORP(word);
  assert.strictEqual(res.focalIndex, expectedFocal, `Falha no índice focal para "${word}": esperado ${expectedFocal}, obtido ${res.focalIndex}`);
  assert.strictEqual(res.focalChar, word[expectedFocal], `Caractere focal incorreto para "${word}"`);
  assert.strictEqual(res.prefix + res.focalChar + res.suffix, word, `Reconstrução da palavra falhou para "${word}"`);
});
console.log('✔ Cálculo de ponto focal foveal aprovado para todos os comprimentos.');

// 2. Teste de Dwell-Time Adaptativo e Wrap-up Sintático
console.log('\nTestando modulação temporal adaptativa e pontuação...');

// Palavra comum simples
const normalWord = calculateORP('tempo', '', true, true);
assert.strictEqual(normalWord.pauseMultiplier, 1.0, 'Palavra comum deve ter multiplicador base 1.0');

// Nome próprio (+38%)
const properNoun = calculateORP('Aristóteles', '', true, true);
assert(properNoun.pauseMultiplier >= 1.38, 'Nomes próprios devem receber incremento de dwell-time');

// Termo longo complexo (+45%)
const complexWord = calculateORP('inconstitucionalidade', '', true, true);
assert(complexWord.pauseMultiplier >= 1.45, 'Palavras longas (>10 caracteres) devem ter dwell-time aumentado');

// Palavra curta (-12%)
const shortWord = calculateORP('de', '', true, true);
assert(shortWord.pauseMultiplier <= 0.89, 'Palavras curtas funcionais devem acelerar o ritmo (-12%)');

// Wrap-up sintático: ponto final (1.85x)
const periodWord = calculateORP('fim.', '', true, true);
assert(periodWord.pauseMultiplier >= 1.85, 'Ponto final deve aplicar pausa reflexiva de 1.85x');

// Wrap-up sintático: vírgula (1.35x)
const commaWord = calculateORP('portanto,', '', true, true);
assert(commaWord.pauseMultiplier >= 1.35, 'Vírgula deve aplicar pausa reflexiva de 1.35x');

console.log('✔ Modulação cognitiva e pausas de wrap-up aprovadas.');

// 3. Teste de cálculo de milissegundos WPM
console.log('\nTestando cálculo de Dwell Time por WPM...');
const baseTime300 = calculateDwellTime(300, 1.0); // 60/300 * 1000 = 200ms
assert.strictEqual(baseTime300, 200, '300 WPM base deve durar 200ms por palavra');

const baseTime600 = calculateDwellTime(600, 1.0); // 60/600 * 1000 = 100ms
assert.strictEqual(baseTime600, 100, '600 WPM base deve durar 100ms por palavra');
console.log('✔ Duração WPM calculada corretamente.');

console.log('\n🎉 TODOS OS TESTES DO MOTOR RSVP PASSARAM COM SUCESSO!');
