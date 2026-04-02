import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'basicStore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promisify for async/await
const promisePool = pool.promise();

// Test database connection
const connect = (callback) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      if (callback) callback(err);
      return;
    }
    console.log('MySQL connected as id', connection.threadId);
    connection.release();
    if (callback) callback(null);
  });
};

// Execute a query with promise
const query = async (sql, values) => {
  try {
    const [rows, fields] = await promisePool.query(sql, values);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Execute a query with connection (for transactions)
const queryWithConnection = async (sql, values) => {
  const connection = await promisePool.getConnection();
  try {
    const [rows] = await connection.query(sql, values);
    return { rows, connection };
  } catch (error) {
    connection.release();
    throw error;
  }
};

// Begin transaction
const beginTransaction = async () => {
  const connection = await promisePool.getConnection();
  await connection.beginTransaction();
  return connection;
};

// Commit transaction
const commitTransaction = async (connection) => {
  await connection.commit();
  connection.release();
};

// Rollback transaction
const rollbackTransaction = async (connection) => {
  await connection.rollback();
  connection.release();
};

export default {
  pool,
  promisePool,
  connect,
  query,
  queryWithConnection,
  beginTransaction,
  commitTransaction,
  rollbackTransaction
};