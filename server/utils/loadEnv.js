import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

/**
 * Load env for the server.
 * - production / npm start → .env
 * - development / npm run dev → .env.development (falls back to .env)
 */
export function loadEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  const preferredName = isProduction ? '.env' : '.env.development';
  const preferredPath = path.join(serverRoot, preferredName);

  let usedName = preferredName;
  let usedPath = preferredPath;

  if (fs.existsSync(preferredPath)) {
    dotenv.config({ path: preferredPath });
  } else if (!isProduction) {
    const fallbackPath = path.join(serverRoot, '.env');
    if (fs.existsSync(fallbackPath)) {
      dotenv.config({ path: fallbackPath });
      usedName = '.env';
      usedPath = fallbackPath;
    }
  } else {
    dotenv.config({ path: preferredPath });
  }

  return {
    name: usedName,
    path: usedPath,
    nodeEnv: process.env.NODE_ENV || (isProduction ? 'production' : 'development')
  };
}

export default loadEnv;
