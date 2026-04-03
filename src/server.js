import app from './app.js';
import { startWebpConversionTask } from './utils/webpConverter.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
  ===========================================
  🛒 ${process.env.APP_NAME || 'BasicStore'} Server
  ===========================================
  ✅ Server running in ${process.env.NODE_ENV || 'development'} mode
  ✅ Listening on port ${PORT}
  ✅ URL: http://localhost:${PORT}
  ===========================================
  `);
  
  // Start the background task for WebP conversion
  startWebpConversionTask();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});