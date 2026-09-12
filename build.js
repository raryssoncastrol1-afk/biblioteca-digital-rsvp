import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const isWatch = process.argv.includes('--watch');

// Garante que o diretório public exista
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

// Copia o worker do PDF.js (e dados de fontes/CMaps) para public/ — permite
// PDF parsing 100% offline (sem CDN) e evita que o esbuild tente empacotar o worker.
function copyPdfAssets() {
  const pdfDir = path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
  const copies = [
    ['build/pdf.worker.min.mjs', 'public/pdf.worker.min.mjs'],
    ['cmaps', 'public/pdf-cmaps'],
    ['standard_fonts', 'public/pdf-standard-fonts']
  ];
  for (const [srcRel, destRel] of copies) {
    const src = path.join(pdfDir, srcRel);
    const dest = path.join(process.cwd(), destRel);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true });
    }
  }
}

const buildOptions = {
  entryPoints: ['src/index.jsx'],
  bundle: true,
  outfile: 'public/reader.bundle.js',
  loader: {
    '.js': 'jsx',
    '.jsx': 'jsx',
    '.svg': 'text'
  },
  target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
  // esbuild 0.28+ erra ao tentar "baixar" destructuring para o target;
  // todos os browsers alvo suportam nativamente (Chrome 49+, Safari 10+),
  // então declaramos como suportado e o output permanece idêntico ao 0.25.
  supported: { destructuring: true },
  format: 'iife',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: true,
  sourcemap: isWatch, // sourcemaps apenas em desenvolvimento (watch)
  logLevel: 'info'
};

async function run() {
  copyPdfAssets();
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('⚡ esbuild assistindo alterações...');
    } else {
      await esbuild.build(buildOptions);
      console.log('✔ Bundle do leitor RSVP Focus compilado com sucesso em public/reader.bundle.js');
    }
  } catch (error) {
    console.error('Erro na compilação do bundle:', error);
    process.exit(1);
  }
}

run();
