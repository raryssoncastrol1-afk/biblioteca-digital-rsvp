import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Evita que o navegador retenha versões antigas de scripts e html em desenvolvimento
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.html') || req.url === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Memória temporária no servidor para sincronização opcional
const memoryBooksStore = [];

// Configuração do Multer para uploads em memória
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Endpoint de listagem de livros no servidor
app.get('/api/books', (req, res) => {
  res.json({ success: true, books: memoryBooksStore });
});

// Endpoint de upload multipart
app.post('/api/upload', upload.array('files'), (req, res) => {
  const uploadedFiles = req.files || [];
  const processed = uploadedFiles.map(file => ({
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: Date.now()
  }));

  res.json({ 
    success: true, 
    count: uploadedFiles.length, 
    files: processed 
  });
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

app.listen(PORT, () => {
  console.log(`🚀 Biblioteca Digital & Leitor RSVP Focus rodando em: http://localhost:${PORT}`);
});
