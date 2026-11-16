const { pool } = require('../config/db');

const DETAIL_SELECT = `
  SELECT e.id, e.student_id, s.student_no, s.full_name AS student_name,
         e.course_id, c.code AS course_code, c.name AS course_name, c.credit_hours,
         e.grade, e.created_at, e.updated_at
    FROM enrollments e
    INNER JOIN students s ON s.id = e.student_id
    INNER JOIN courses  c ON c.id = e.course_id`;

// Optional filters pattern: ($1::int IS NULL OR column = $1) ignores the filter when the param is NULL.
async function list({ studentId = null, courseId = null, limit, offset }, db = pool) {
  const { rows } = await db.query(
    `${DETAIL_SELECT}
      WHERE ($1::int IS NULL OR e.student_id = $1)
        AND ($2::int IS NULL OR e.course_id  = $2)
      ORDER BY e.id
      LIMIT $3 OFFSET $4`,
    [studentId, courseId, limit, offset]
  );
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${DETAIL_SELECT} WHERE e.id = $1`, [id]);
  return rows[0] || null;
}

async function findByStudentAndCourse(studentId, courseId, db = pool) {
  const { rows } = await db.query(`${DETAIL_SELECT} WHERE e.student_id = $1 AND e.course_id = $2`, [studentId, courseId]);
  return rows[0] || null;
}

async function create({ studentId, courseId }, db = pool) {
  const { rows } = await db.query(
    'INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING id',
    [studentId, courseId]
  );
  return findById(rows[0].id, db);
}

// grade may be a number or NULL (clears the grade)
async function updateGradeById(id, grade, db = pool) {
  const { rows } = await db.query(
    'UPDATE enrollments SET grade = $1, updated_at = now() WHERE id = $2 RETURNING id',
    [grade, id]
  );
  return rows[0] ? findById(id, db) : null;
}

async function remove(id, db = pool) {
  const { rows } = await db.query('DELETE FROM enrollments WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

// A student's courses (JOIN enrollments + courses + teachers)
async function findCoursesByStudent(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT c.id AS course_id, c.code, c.name, c.credit_hours,
            t.full_name AS teacher_name, e.grade
       FROM enrollments e
       INNER JOIN courses  c ON c.id = e.course_id
       INNER JOIN teachers t ON t.id = c.teacher_id
      WHERE e.student_id = $1
      ORDER BY c.code`,
    [studentId]
  );
  return rows;
}

// Transcript rows = same data as above, ordered by course code.
const transcriptRows = findCoursesByStudent;

/**
 * Transcript statistics, computed by PostgreSQL (aggregation is what databases are good at).
 *
 * Weighted average = SUM(grade * credit_hours) / SUM(credit_hours), over GRADED courses only.
 * FILTER (WHERE grade IS NOT NULL) skips courses that have no grade yet.
 * NULLIF(..., 0) avoids division by zero when nothing is graded (result becomes NULL).
 */
async function transcriptSummary(studentId, db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int                                                        AS total_courses,
            COUNT(e.grade)::int                                                  AS graded_courses,
            COALESCE(SUM(c.credit_hours), 0)::int                                AS total_credit_hours,
            COALESCE(SUM(c.credit_hours) FILTER (WHERE e.grade IS NOT NULL), 0)::int AS graded_credit_hours,
            ROUND(AVG(e.grade), 2)::float                                        AS simple_average,
            ROUND(
              SUM(e.grade * c.credit_hours) FILTER (WHERE e.grade IS NOT NULL)
              / NULLIF(SUM(c.credit_hours) FILTER (WHERE e.grade IS NOT NULL), 0), 2
            )::float                                                             AS weighted_average
       FROM enrollments e
       INNER JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = $1`,
    [studentId]
  );
  return rows[0];
}

async function overallStats(db = pool) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total_enrollments,
            COUNT(grade)::int AS graded_enrollments,
            ROUND(AVG(grade), 2)::float AS average_grade
       FROM enrollments`
  );
  return rows[0];
}

module.exports = {
  list, findById, findByStudentAndCourse, create, updateGradeById, remove,
  findCoursesByStudent, transcriptRows, transcriptSummary, overallStats,
};
