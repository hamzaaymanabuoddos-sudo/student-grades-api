// Entry point: verify the database is reachable, then start listening.
const app = require('./app');
const env = require('./config/env');
const { pool, testConnection } = require('./config/db');

async function start() {
  try {
    const info = await testConnection();
    console.log(`[db] Connected to "${info.db}" at ${info.now.toISOString()}`);
  } catch (err) {
    console.error('[db] Could not connect to PostgreSQL:', err.message);
    console.error('     Check DB_* values in .env and that PostgreSQL is running.');
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    console.log(`[server] Running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown (Ctrl+C): stop accepting requests, then close DB connections.
  const shutdown = () => {
    console.log('\n[server] Shutting down...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
