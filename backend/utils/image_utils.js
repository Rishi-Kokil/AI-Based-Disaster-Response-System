import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {logger} from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const saveImage = async (band, date, buffer) => {
  const dir = path.join(__dirname, `../image_dump/${band}`);
  logger.info(`Saving image for band ${band} and date ${date}`);
  
  try {
    await fs.mkdir(dir, { recursive: true });
    const filename = `${date}_${band}_gamma0_terrain.tif`;
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);
    logger.debug(`Image saved at: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Failed to save image: ${error.message}`);
    throw error;
  }
};