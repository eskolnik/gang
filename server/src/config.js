/**
 * Application configuration
 * Reads from environment variables with sensible defaults
 */

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',

  // Database
  dbPath: process.env.DB_PATH || './game_state.db',

  // Cleanup
  cleanupCron: process.env.CLEANUP_CRON || '*/5 * * * *',
  cleanupTimezone: process.env.CLEANUP_TIMEZONE || 'America/New_York',

  // Derived helpers
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};

// Log configuration on startup (hide sensitive values in production)
if (config.isDevelopment) {
  console.log('📋 Configuration:', config);
}
