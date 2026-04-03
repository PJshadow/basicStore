import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const listProducts = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'basicStore'
  });

  try {
    const [rows] = await connection.execute('SELECT name, slug, image_url, featured FROM products');
    console.table(rows);
  } catch (error) {
    console.error('Error listing products:', error.message);
  } finally {
    await connection.end();
  }
};

listProducts();
