import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { promisePool } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '../public');
const SRC_DIR = path.join(__dirname, '..');

/**
 * Replace all occurrences of old link with new link in a file
 */
const updateLinksInFile = async (filePath, oldLink, newLink) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    if (content.includes(oldLink)) {
      const updatedContent = content.split(oldLink).join(newLink);
      await fs.promises.writeFile(filePath, updatedContent, 'utf8');
      console.log(`[WebP Converter] Updated links in file: ${filePath}`);
    }
  } catch (error) {
    console.error(`[WebP Converter] Failed to update links in file ${filePath}:`, error.message);
  }
};

/**
 * Scan directory recursively for files to update links
 */
const updateLinksInDirectory = async (dir, oldLink, newLink) => {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        await updateLinksInDirectory(fullPath, oldLink, newLink);
      }
    } else if (['.ejs', '.css', '.js', '.html'].includes(path.extname(fullPath))) {
      await updateLinksInFile(fullPath, oldLink, newLink);
    }
  }
};

/**
 * Update link in all columns of all tables in the database
 */
const updateLinksInDatabase = async (oldLink, newLink) => {
  try {
    // Get all tables
    const [tables] = await promisePool.execute("SHOW TABLES");
    const dbName = process.env.DB_NAME || 'basicStore';
    const tableKey = `Tables_in_${dbName}`;

    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      // Get all columns for this table
      const [columns] = await promisePool.execute(`SHOW COLUMNS FROM ${tableName}`);
      
      for (const column of columns) {
        const columnName = column.Field;
        const columnType = column.Type.toLowerCase();
        
        // Only update text-based columns
        if (columnType.includes('varchar') || columnType.includes('text')) {
          const sql = `UPDATE ${tableName} SET ${columnName} = REPLACE(${columnName}, ?, ?) WHERE ${columnName} LIKE ?`;
          const [result] = await promisePool.execute(sql, [oldLink, newLink, `%${oldLink}%`]);
          if (result.affectedRows > 0) {
            console.log(`[WebP Converter] Updated database table ${tableName}, column ${columnName}: ${result.affectedRows} rows updated.`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`[WebP Converter] Failed to update links in database:`, error.message);
  }
};

/**
 * Scan filesystem for non-WebP images
 */
const scanFilesystemForImages = async (dir, imageFiles = []) => {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await scanFilesystemForImages(fullPath, imageFiles);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.png', '.jpg', '.jpeg'].includes(ext)) {
        imageFiles.push(fullPath);
      }
    }
  }
  return imageFiles;
};

/**
 * Task that periodically converts non-WebP images to WebP format
 * and updates their links everywhere.
 */
export const startWebpConversionTask = () => {
  const intervalMs = parseInt(process.env.WEBP_CONVERSION_INTERVAL) || 300000;
  console.log(`[WebP Converter] Background task initialized. Running every ${intervalMs}ms`);

  const runCycle = async () => {
    console.log(`[WebP Converter] [${new Date().toISOString()}] Starting conversion cycle...`);
    
    try {
      // Find all non-webp images in public directory
      const imageFiles = await scanFilesystemForImages(PUBLIC_DIR);
      
      if (imageFiles.length === 0) {
        console.log(`[WebP Converter] No non-WebP images detected on filesystem.`);
      }

      for (const absoluteOldPath of imageFiles) {
        const relativePath = path.relative(PUBLIC_DIR, absoluteOldPath);
        const oldUrl = '/' + relativePath.replace(/\\/g, '/');
        const extension = path.extname(absoluteOldPath);
        const newUrl = oldUrl.substring(0, oldUrl.length - extension.length) + ".webp";
        const absoluteNewPath = absoluteOldPath.substring(0, absoluteOldPath.length - extension.length) + ".webp";

        console.log(`[WebP Converter] Found image: ${oldUrl}. Converting to WebP...`);

        try {
          await sharp(absoluteOldPath)
            .webp({ quality: 80 })
            .toFile(absoluteNewPath);

          console.log(`[WebP Converter] Successfully created: ${absoluteNewPath}`);

          // 3. Change all links to it
          
          // Update Database (all tables, all columns)
          await updateLinksInDatabase(oldUrl, newUrl);
          
          // Handle relative links without leading slash
          const oldUrlNoSlash = oldUrl.startsWith('/') ? oldUrl.substring(1) : oldUrl;
          const newUrlNoSlash = newUrl.startsWith('/') ? newUrl.substring(1) : newUrl;
          if (oldUrl !== oldUrlNoSlash) {
            await updateLinksInDatabase(oldUrlNoSlash, newUrlNoSlash);
          }

          // Update source code files (EJS, CSS, JS)
          await updateLinksInDirectory(SRC_DIR, oldUrl, newUrl);
          if (oldUrl !== oldUrlNoSlash) {
            await updateLinksInDirectory(SRC_DIR, oldUrlNoSlash, newUrlNoSlash);
          }

          // Optional: Delete the old file
          fs.unlinkSync(absoluteOldPath);
          console.log(`[WebP Converter] Deleted old image: ${absoluteOldPath}`);

        } catch (error) {
          console.error(`[WebP Converter] Failed to process image ${oldUrl}:`, error.message);
        }
      }
      
      console.log(`[WebP Converter] Cycle completed.`);
    } catch (error) {
      console.error(`[WebP Converter] Error during conversion cycle:`, error.message);
    }
  };

  // Run once immediately on start
  runCycle();

  // Then set interval
  setInterval(runCycle, intervalMs);
};

