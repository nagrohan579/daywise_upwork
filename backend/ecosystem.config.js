module.exports = {
  apps: [
    {
      name: 'daywise-backend',
      script: './dist/index.js',

      // Auto-restart configuration
      autorestart: true,
      max_restarts: Infinity, // Keep restarting forever until Convex comes back
      min_uptime: '10s',
      max_memory_restart: '500M',

      // Restart delay configuration
      restart_delay: 5000, // Wait 5 seconds before restarting

      // Error handling
      exp_backoff_restart_delay: 100, // Exponential backoff starting at 100ms

      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Watch and ignore patterns (optional, usually disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'dist'],

      // Instance configuration
      instances: 1,
      exec_mode: 'fork',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ]
};
