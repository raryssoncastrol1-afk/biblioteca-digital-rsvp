import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.get('/api/books', (req, res) => {
  res.json({ success: true, books: [] });
});

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

export default app;
