import session from 'express-session';
import dotenv from 'dotenv';

dotenv.config();

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'your_session_secret_key_here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  // In production, use a session store like Redis or MySQL
  // store: sessionStore
};

// For production, you would configure a session store here
if (process.env.NODE_ENV === 'production') {
  // Example with MySQL session store (requires express-mysql-session)
  // const MySQLStore = require('express-mysql-session')(session);
  // const sessionStore = new MySQLStore({
  //   host: process.env.DB_HOST,
  //   port: process.env.DB_PORT,
  //   user: process.env.DB_USER,
  //   password: process.env.DB_PASSWORD,
  //   database: process.env.DB_NAME
  // });
  // sessionConfig.store = sessionStore;
  
  sessionConfig.cookie.secure = true; // Requires HTTPS
}

export default sessionConfig;