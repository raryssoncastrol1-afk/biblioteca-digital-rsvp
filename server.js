import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApiApp } from './api/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = createApiApp();

// Evita que o navegador retenha versões antigas de scripts e html em desenvolvimento
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.html') || req.url === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Servir arquivos estáticos do PWA
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Fallback SPA para servir o index.html
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Biblioteca Digital & Leitor RSVP Focus rodando em: http://localhost:${PORT}`);
});