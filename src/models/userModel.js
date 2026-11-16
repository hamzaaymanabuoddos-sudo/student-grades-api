// MODEL: only SQL lives here. No req/res, no HTTP, no business decisions.
// Each function takes an optional `db` (pool by default). Passing a transaction client
// lets the same function participate in a transaction.
const { pool } = require('../config/db');

// password_hash is selected ONLY by findByEmail (needed for login). Everything else omits it.
const SAFE_COLUMNS = 'id, email, role, created_at';

async function findByEmail(email, db = pool) {
  const { rows } = await db.query(
    'SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

// LEFT JOIN: every user has a row in `users`, but only some have a student row and only some a teacher row.
// INNER JOIN would drop admins (no profile). LEFT JOIN keeps them with NULL profile columns.
async function findByIdWithProfile(id, db = pool) {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.role,
            s.id AS student_id, s.student_no, s.full_name AS student_name,
            t.id AS teacher_id, t.full_name AS teacher_name
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN teachers t ON t.user_id = u.id
      WHERE u.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ email, passwordHash, role }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING ${SAFE_COLUMNS}`,
    [email, passwordHash, role]
  );
  return rows[0];
}

async function updateEmail(id, email, db = pool) {
  const { rows } = await db.query(`UPDATE users SET email = $1 WHERE id = $2 RETURNING ${SAFE_COLUMNS}`, [email, id]);
  return rows[0] || null;
}

async function list({ limit, offset }, db = pool) {
  const { rows } = await db.query(
    `SELECT ${SAFE_COLUMNS} FROM users ORDER BY id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function remove(id, db = pool) {
  const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

// Aggregation: COUNT + GROUP BY
async function countByRole(db = pool) {
  const { rows } = await db.query('SELECT role, COUNT(*)::int AS total FROM users GROUP BY role ORDER BY role');
  return rows;
}

module.exports = { findByEmail, findById, findByIdWithProfile, create, updateEmail, list, remove, countByRole };
