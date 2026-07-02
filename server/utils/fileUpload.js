import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory inside the backend: server/uploads
const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

/**
 * Saves a file to the disk under a specific sub-folder inside server/uploads
 * @param {Object} file - Multer file object
 * @param {string} folderName - Subfolder name (e.g., 'products', 'profile', 'petty-cash', 'general')
 * @returns {Promise<string>} - The web relative path starting with /uploads/
 */
export const saveFileToDisk = async (file, folderName) => {
  if (!file) return null;

  const targetDir = path.join(UPLOADS_ROOT, folderName);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const filePath = path.join(targetDir, uniqueName);

  await fs.promises.writeFile(filePath, file.buffer);

  return `/uploads/${folderName}/${uniqueName}`;
};

/**
 * Deletes a file from the server/uploads directory
 * @param {string} relativePath - The web relative path starting with /uploads/
 */
export const deleteFileFromDisk = (relativePath) => {
  if (!relativePath || !relativePath.startsWith('/uploads/')) return;

  try {
    const subPath = relativePath.substring('/uploads/'.length);
    const absolutePath = path.join(UPLOADS_ROOT, subPath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error(`[fileUpload] Failed to delete file: ${relativePath}`, error);
  }
};
