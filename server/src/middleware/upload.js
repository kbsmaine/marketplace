import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.resolve('src/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

function fileFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image uploads are allowed'));
}

export const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
