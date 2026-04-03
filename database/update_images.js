import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const updateImages = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'basicStore'
  });

  console.log('Updating product image URLs in database...');

  const updates = [
    { slug: 'wireless-headphones', imageUrl: '/images/wireless-headphones.webp' },
    { slug: 'smart-watch', imageUrl: '/images/smart-watch.webp' },
    { slug: 'backpack', imageUrl: '/images/backpack.webp' },
    { slug: 'coffee-maker', imageUrl: '/images/coffee-maker.webp' }
  ];

  try {
    for (const update of updates) {
      await connection.execute(
        'UPDATE products SET image_url = ? WHERE slug = ?',
        [update.imageUrl, update.slug]
      );
      console.log(`Updated image for ${update.slug}`);
    }
    console.log('All images updated successfully!');
  } catch (error) {
    console.error('Error updating images:', error.message);
  } finally {
    await connection.end();
  }
};

updateImages();
