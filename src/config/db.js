// PostgreSQL connection pool.
//
// WHAT: A Pool keeps several open connections to PostgreSQL and lends them out.
// WHY:  Opening a new connection for every request is slow. The pool reuses them.
// HOW:  pool.query() borrows a connection, runs ONE query, returns it automatically.
//       For multi-step work (transactions) we borrow one client with pool.connect()
//       because BEGIN ... COMMIT must all happen on the SAME connection.
const { Pool, types } = require('pg');
const env = require('./env');

// PostgreSQL NUMERIC values arrive in JS as strings ("90.00") to avoid precision loss.
// Our grades are small (0-100, 2 decimals) so converting to a JS number is safe and
// makes JSON responses friendlier. (Do NOT do this for money in a real system.)
types.setTypeParser(1700, (value) => parseFloat(value));

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  max: 10,                        // max connections in the pool
  idleTimeoutMillis: 30000,       // close idle connections after 30s
  connectionTimeoutMillis: 5000,  // fail if no connection within 5s
});

// An idle client can emit an error (e.g. database restarted). Without this handler Node would crash.
pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err.message);
});

// Run one parameterized query. Always pass user input through `params`, never through string concatenation.
const query = (text, params) => pool.query(text, params);

/**
 * Run several queries as ONE all-or-nothing unit.
 * `callback` receives a dedicated client; use client.query(...) inside it.
 * If the callback throws, everything is rolled back.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release(); // ALWAYS give the connection back to the pool
  }
}

async function testConnection() {
  const { rows } = await pool.query('SELECT NOW() AS now, current_database() AS db');
  return rows[0];
}

module.exports = { pool, query, withTransaction, testConnection };
