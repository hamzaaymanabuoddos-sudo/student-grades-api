const { pool, withTransaction } = require('../config/db');
const userModel = require('./userModel');

// INNER JOIN users: every student MUST have a user (NOT NULL foreign key), so no rows are lost.
const BASE_SELECT = `
  SELECT s.id, s.user_id, s.student_no, s.full_name, u.email
    FROM students s
    INNER JOIN users u ON u.id = s.user_id`;

async function list({ limit, offset, search = null }, db = pool) {
  const { rows } = await db.query(
    `${BASE_SELECT}
      WHERE ($1::text IS NULL
             OR s.full_name  ILIKE '%' || $1 || '%'
             OR s.student_no ILIKE '%' || $1 || '%')
      ORDER BY s.full_name
      LIMIT $2 OFFSET $3`,
    [search, limit, offset]
  );
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${BASE_SELECT} WHERE s.id = $1`, [id]);
  return rows[0] || null;
}

/**
 * Creates the login account AND the student profile.
 * TRANSACTION IS NECESSARY HERE: two inserts in two tables that must succeed together.
 * Without it, a failure in the second insert (e.g. duplicate student_no) would leave an orphan user.
 */
function createWithUser({ email, passwordHash, studentNo, fullName }) {
  return withTransaction(async (client) => {
    const user = await userModel.create({ email, passwordHash, role: 'student' }, client);
    const { rows } = await client.query(
      `INSERT INTO students (user_id, student_no, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, student_no, full_name`,
      [user.id, studentNo, fullName]
    );
    return { ...rows[0], email: user.email };
  });
}

/**
 * Partial update: COALESCE($n, column) keeps the old value when the new one is NULL.
 * Transaction is needed because email lives in `users` and the rest in `students`.
 */
function update(id, { studentNo, fullName, email }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE students
          SET student_no = COALESCE($1, student_no),
              full_name  = COALESCE($2, full_name)
        WHERE id = $3
        RETURNING user_id`,
      [studentNo ?? null, fullName ?? null, id]
    );
    if (rows.length === 0) return null;
    if (email) await userModel.updateEmail(rows[0].user_id, email, client);
    return findById(id, client);
  });
}

module.exports = { list, findById, createWithUser, update };
