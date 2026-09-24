import express from 'express';
import cors from 'cors';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por arquivo
    files: 10 // Máximo de 10 arquivos simultâneos
  },
  fileFilter: (req, file, cb) => {
    // Permite apenas formatos suportados pelo ecossistema da biblioteca
    const allowedExts = /\.(epub|pdf|docx|txt|md|mobi|azw3)$/i;
    if (file.originalname.match(allowedExts)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato de arquivo não suportado: ${file.originalname}`));
    }
  }
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

  // Endpoint de upload multipart defensivo
  app.post('/api/upload', (req, res, next) => {
    upload.array('files', 10)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `Erro no upload: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ success: false, error: err.message });
      }

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
  });

  return app;
}