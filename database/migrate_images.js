import { promisePool } from '../src/models/db.js';

const runMigration = async () => {
  try {
    console.log('Starting migration: create product_images table...');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS product_images (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        image_url VARCHAR(500) NOT NULL,
        is_main BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `;
    
    await promisePool.execute(sql);
    console.log('✅ Migration successful: product_images table created.');
    
    // Transfer existing images to the new table
    console.log('Transferring existing product images...');
    const [products] = await promisePool.execute('SELECT id, image_url FROM products WHERE image_url IS NOT NULL');
    
    for (const product of products) {
        // Check if already transferred
        const [existing] = await promisePool.execute('SELECT id FROM product_images WHERE product_id = ? AND image_url = ?', [product.id, product.image_url]);
        if (existing.length === 0) {
            await promisePool.execute('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, TRUE)', [product.id, product.image_url]);
        }
    }
    console.log('✅ Existing images transferred.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
