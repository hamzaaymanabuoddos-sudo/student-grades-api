const { pool } = require('../config/db');

const BASE_SELECT = `
  SELECT c.id, c.code, c.name, c.credit_hours, c.teacher_id, t.full_name AS teacher_name
    FROM courses c
    INNER JOIN teachers t ON t.id = c.teacher_id`;

async function list({ limit, offset }, db = pool) {
  const { rows } = await db.query(`${BASE_SELECT} ORDER BY c.code LIMIT $1 OFFSET $2`, [limit, offset]);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${BASE_SELECT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function create({ code, name, creditHours, teacherId }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO courses (code, name, credit_hours, teacher_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [code, name, creditHours, teacherId]
  );
  return findById(rows[0].id, db);
}

async function update(id, { code, name, creditHours, teacherId }, db = pool) {
  const { rows } = await db.query(
    `UPDATE courses
        SET code         = COALESCE($1, code),
            name         = COALESCE($2, name),
            credit_hours = COALESCE($3, credit_hours),
            teacher_id   = COALESCE($4, teacher_id)
      WHERE id = $5
      RETURNING id`,
    [code ?? null, name ?? null, creditHours ?? null, teacherId ?? null, id]
  );
  return rows[0] ? findById(id, db) : null;
}

async function remove(id, db = pool) {
  const { rows } = await db.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

// LEFT JOIN + COUNT + GROUP BY: a course with zero enrollments must still appear (count = 0).
// With INNER JOIN, empty courses would disappear from the result.
async function findByTeacherId(teacherId, db = pool) {
  const { rows } = await db.query(
    `SELECT c.id, c.code, c.name, c.credit_hours, COUNT(e.id)::int AS enrolled_count
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
      WHERE c.teacher_id = $1
      GROUP BY c.id
      ORDER BY c.code`,
    [teacherId]
  );
  return rows;
}

// Students enrolled in one course (3-table JOIN).
async function findStudents(courseId, db = pool) {
  const { rows } = await db.query(
    `SELECT e.id AS enrollment_id, s.id AS student_id, s.student_no, s.full_name, u.email, e.grade
       FROM enrollments e
       INNER JOIN students s ON s.id = e.student_id
       INNER JOIN users u    ON u.id = s.user_id
      WHERE e.course_id = $1
      ORDER BY s.full_name`,
    [courseId]
  );
  return rows;
}

// Aggregation per course: COUNT, AVG, MIN, MAX with GROUP BY.
// COUNT(e.grade) counts only NON-NULL grades; COUNT(e.id) counts all enrollments.
async function statsPerCourse(db = pool) {
  const { rows } = await db.query(
    `SELECT c.id, c.code, c.name,
            COUNT(e.id)::int           AS enrolled,
            COUNT(e.grade)::int        AS graded,
            ROUND(AVG(e.grade), 2)::float AS average_grade,
            MIN(e.grade)               AS lowest_grade,
            MAX(e.grade)               AS highest_grade
       FROM courses c
       LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id
      ORDER BY c.code`
  );
  return rows;
}

module.exports = { list, findById, create, update, remove, findByTeacherId, findStudents, statsPerCourse };
