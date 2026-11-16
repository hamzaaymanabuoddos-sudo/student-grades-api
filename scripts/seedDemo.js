// Optional demo data so you can test with Postman immediately.
// Usage: npm run seed:demo        (all demo passwords: Password123)
const { pool, withTransaction } = require('../src/config/db');
const userModel = require('../src/models/userModel');
const teacherModel = require('../src/models/teacherModel');
const studentModel = require('../src/models/studentModel');
const courseModel = require('../src/models/courseModel');
const enrollmentModel = require('../src/models/enrollmentModel');
const { hashPassword } = require('../src/utils/password');

(async () => {
  try {
    if (await userModel.findByEmail('teacher1@university.edu')) {
      console.log('Demo data already present. Nothing to do.');
      return;
    }
    const passwordHash = await hashPassword('Password123');

    // One transaction: either ALL demo data is inserted or NONE.
    await withTransaction(async (client) => {
      const insertTeacher = async (email, fullName) => {
        const u = await userModel.create({ email, passwordHash, role: 'teacher' }, client);
        const { rows } = await client.query('INSERT INTO teachers (user_id, full_name) VALUES ($1,$2) RETURNING id', [u.id, fullName]);
        return rows[0].id;
      };
      const insertStudent = async (email, studentNo, fullName) => {
        const u = await userModel.create({ email, passwordHash, role: 'student' }, client);
        const { rows } = await client.query('INSERT INTO students (user_id, student_no, full_name) VALUES ($1,$2,$3) RETURNING id', [u.id, studentNo, fullName]);
        return rows[0].id;
      };

      const t1 = await insertTeacher('teacher1@university.edu', 'Dr. Sara Haddad');
      const t2 = await insertTeacher('teacher2@university.edu', 'Dr. Omar Nasser');

      const s1 = await insertStudent('hamza@university.edu', 'S2024001', 'Hamza Ayman');
      const s2 = await insertStudent('lina@university.edu', 'S2024002', 'Lina Khalil');
      const s3 = await insertStudent('yousef@university.edu', 'S2024003', 'Yousef Barakat');

      const prog = await courseModel.create({ code: 'CS101', name: 'Programming', creditHours: 3, teacherId: t1 }, client);
      const db = await courseModel.create({ code: 'CS201', name: 'Database', creditHours: 3, teacherId: t1 }, client);
      const node = await courseModel.create({ code: 'CS301', name: 'Node.js', creditHours: 3, teacherId: t2 }, client);

      const enroll = (s, c) => enrollmentModel.create({ studentId: s, courseId: c.id }, client);
      const e1 = await enroll(s1, prog); const e2 = await enroll(s1, db); const e3 = await enroll(s1, node);
      await enroll(s2, prog); await enroll(s2, node); await enroll(s3, db);

      await enrollmentModel.updateGradeById(e1.id, 90, client);
      await enrollmentModel.updateGradeById(e2.id, 85, client);
      await enrollmentModel.updateGradeById(e3.id, 92, client);
    });

    console.log('Demo data created.');
    console.log('Logins (password Password123): teacher1@university.edu, teacher2@university.edu, hamza@university.edu, lina@university.edu, yousef@university.edu');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
