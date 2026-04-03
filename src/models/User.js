import bcrypt from 'bcrypt';
import { promisePool } from './db.js';

// User factory function - returns an object with all user methods
const createUserModel = () => {
  // Create a new user
  const create = async (userData) => {
    const { username, email, password, role = 'staff' } = userData;
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const sql = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [username, email, passwordHash, role]);
      return { id: result.insertId, username, email, role };
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  };

  // Find user by ID
  const findById = async (id) => {
    const sql = 'SELECT id, username, email, role, created_at, updated_at FROM users WHERE id = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [id]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  };

  // Find user by email
  const findByEmail = async (email) => {
    const sql = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [email]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  };

  // Find user by username
  const findByUsername = async (username) => {
    const sql = 'SELECT * FROM users WHERE username = ?';
    
    try {
      const [rows] = await promisePool.execute(sql, [username]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by username: ${error.message}`);
    }
  };

  // Update user
  const update = async (id, userData) => {
    const { username, email, role } = userData;
    const sql = `
      UPDATE users 
      SET username = ?, email = ?, role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    try {
      const [result] = await promisePool.execute(sql, [username, email, role, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  };

  // Update password
  const updatePassword = async (id, newPassword) => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const sql = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [passwordHash, id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    
    try {
      const [result] = await promisePool.execute(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  };

  // Get all users with pagination
  const findAll = async (page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const sql = `
      SELECT id, username, email, role, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    try {
      const [rows] = await promisePool.execute(sql, [limit, offset]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding all users: ${error.message}`);
    }
  };

  // Count total users
  const count = async () => {
    const sql = 'SELECT COUNT(*) as total FROM users';
    
    try {
      const [rows] = await promisePool.execute(sql);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  };

  // Verify password
  const verifyPassword = async (user, password) => {
    return await bcrypt.compare(password, user.password_hash);
  };

  // Return all methods as an object
  return {
    create,
    findById,
    findByEmail,
    findByUsername,
    update,
    updatePassword,
    delete: deleteUser,
    findAll,
    count,
    verifyPassword
  };
};

// Create and export the user model
const User = createUserModel();
export default User;