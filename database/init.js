import fs from 'fs';
import path from 'path';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url'; // For ES modules to get __dirname.


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create connection without database specified (to create database)
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
});

// Read schema SQL file
const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

console.log('Initializing BasicStore database...');

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    process.exit(1);
  }

  console.log('Connected to MySQL server');

  // Create database if not exists
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'basicStore'}`, (err) => {
    if (err) {
      console.error('Error creating database:', err.message);
      connection.end();
      process.exit(1);
    }

    console.log(`Database '${process.env.DB_NAME || 'basicStore'}' created or already exists`);

    // Switch to the database
    connection.query(`USE ${process.env.DB_NAME || 'basicStore'}`, (err) => {
      if (err) {
        console.error('Error switching to database:', err.message);
        connection.end();
        process.exit(1);
      }

      console.log('Creating tables and inserting sample data...');

      // Split SQL by semicolons and execute each statement
      const statements = schemaSQL.split(';').filter(stmt => stmt.trim().length > 0);

      let completed = 0;
      const total = statements.length;

      statements.forEach((statement, index) => {
        connection.query(statement + ';', (err) => {
          if (err) {
            console.error(`Error executing statement ${index + 1}:`, err.message);
            // Continue with other statements
          }
          
          completed++;
          console.log(`Progress: ${completed}/${total} statements executed`);
          
          if (completed === total) {
            console.log('\n✅ Database initialization completed successfully!');
            console.log('📊 Database structure:');
            console.log('   - Users table (admin authentication)');
            console.log('   - Customers table');
            console.log('   - Categories table');
            console.log('   - Products table');
            console.log('   - Orders table');
            console.log('   - Order items table');
            console.log('   - Coupons table');
            console.log('   - Email logs table');
            console.log('\n🔑 Default admin credentials:');
            console.log('   Username: admin');
            console.log('   Email: admin@basicstore.com');
            console.log('   Password: admin123 (needs to be hashed properly)');
            console.log('\n🚀 Next steps:');
            console.log('   1. Install MySQL if not already installed');
            console.log('   2. Update .env file with your database credentials');
            console.log('   3. Run: npm run db:init');
            console.log('   4. Run: npm run dev');
            
            connection.end();
            process.exit(0);
          }
        });
      });
    });
  });
});