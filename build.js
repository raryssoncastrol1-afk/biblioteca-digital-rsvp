import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

// Garante que o diretório public exista
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
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
  format: 'iife',
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  minify: true,
  sourcemap: isWatch, // sourcemaps apenas em desenvolvimento (watch)
  logLevel: 'info'
};

async function run() {
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
