const { pool, withTransaction } = require('../config/db');
const userModel = require('./userModel');

const BASE_SELECT = `
  SELECT t.id, t.user_id, t.full_name, u.email
    FROM teachers t
    INNER JOIN users u ON u.id = t.user_id`;

async function list({ limit, offset }, db = pool) {
  const { rows } = await db.query(`${BASE_SELECT} ORDER BY t.full_name LIMIT $1 OFFSET $2`, [limit, offset]);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${BASE_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] || null;
}

// Transaction needed: users + teachers inserts must succeed or fail together.
function createWithUser({ email, passwordHash, fullName }) {
  return withTransaction(async (client) => {
    const user = await userModel.create({ email, passwordHash, role: 'teacher' }, client);
    const { rows } = await client.query(
      'INSERT INTO teachers (user_id, full_name) VALUES ($1, $2) RETURNING id, user_id, full_name',
      [user.id, fullName]
    );
    return { ...rows[0], email: user.email };
  });
}

function update(id, { fullName, email }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      'UPDATE teachers SET full_name = COALESCE($1, full_name) WHERE id = $2 RETURNING user_id',
      [fullName ?? null, id]
    );
    if (rows.length === 0) return null;
    if (email) await userModel.updateEmail(rows[0].user_id, email, client);
    return findById(id, client);
  });
}

module.exports = { list, findById, createWithUser, update };
