/**
 * middleware/upload.js
 * Multer configuration for photo uploads.
 * Supports HEIC/HEIF (iPhone photos) — auto-converts to JPEG using sharp.
 * Organizes files into /frontend/public/uploads/{recipes|creations}/
 *
 * Requires: npm install sharp
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Try to load sharp — if not installed yet, fall back to saving files as-is
let sharp;
try {
  sharp = require('sharp');
} catch {
  console.warn('[upload] sharp not installed — HEIC conversion disabled. Run: npm install sharp');
  sharp = null;
}

const UPLOAD_BASE = path.join(__dirname, '../../frontend/public/uploads');

['recipes', 'creations'].forEach(folder => {
  const dir = path.join(UPLOAD_BASE, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Use memory storage so we can intercept and convert before saving
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts  = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif',
  ];
  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type "${ext}". Allowed: jpg, png, webp, heic.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB to accommodate large HEIC
});

/**
 * After multer buffers the file in memory:
 * - Converts HEIC/HEIF → JPEG (requires sharp)
 * - Auto-rotates based on EXIF (fixes portrait phone photos)
 * - Resizes to max 1800px
 * - Saves to the correct uploads subfolder
 * - Sets req.file.savedAs for the route handler
 */
async function processAndSavePhoto(req, res, next) {
  if (!req.file) return next();

  const folder  = req.baseUrl.includes('creations') ? 'creations' : 'recipes';
  const destDir = path.join(UPLOAD_BASE, folder);

  const originalExt = path.extname(req.file.originalname).toLowerCase();
  const isHeic = ['.heic', '.heif'].includes(originalExt) ||
                 ['image/heic', 'image/heif'].includes(req.file.mimetype);

  const baseName = path.basename(req.file.originalname, originalExt)
    .replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);

  try {
    if (sharp) {
      // Process with sharp: convert, rotate, resize
      const outputExt  = '.jpg';
      const filename   = `${Date.now()}-${baseName}${outputExt}`;
      const outputPath = path.join(destDir, filename);

      await sharp(req.file.buffer)
        .rotate()  // auto-rotate based on EXIF orientation
        .resize(1800, 1800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 88 })
        .toFile(outputPath);

      req.file.filename = filename;
      req.file.path     = outputPath;
      req.file.savedAs  = `/uploads/${folder}/${filename}`;
    } else {
      // sharp not available — save the raw buffer as-is
      if (isHeic) {
        return next(new Error('HEIC conversion requires sharp. Run: npm install sharp'));
      }
      const filename   = `${Date.now()}-${baseName}${originalExt}`;
      const outputPath = path.join(destDir, filename);
      fs.writeFileSync(outputPath, req.file.buffer);
      req.file.filename = filename;
      req.file.path     = outputPath;
      req.file.savedAs  = `/uploads/${folder}/${filename}`;
    }

    next();
  } catch (err) {
    console.error('[upload] Image processing error:', err.message);
    next(new Error('Could not process image: ' + err.message));
  }
}

module.exports = { upload, processAndSavePhoto };

