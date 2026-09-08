import express from 'express';
import cors from 'cors';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * Factory do app Express compartilhado entre o servidor local (server.js)
 * e as serverless functions da Vercel (api/index.js).
 */
export function createApiApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Memória temporária para sincronização opcional (não persistida)
  const memoryBooksStore = [];

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

  return app;
}