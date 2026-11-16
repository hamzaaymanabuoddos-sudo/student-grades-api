// Creates the FIRST admin (someone has to exist before they can create teachers).
// Usage: npm run seed:admin   (reads ADMIN_EMAIL / ADMIN_PASSWORD from .env)
const { pool } = require('../src/config/db');
const userModel = require('../src/models/userModel');
const { hashPassword } = require('../src/utils/password');
const { rules, normalizeEmail } = require('../src/utils/validators');

(async () => {
  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
    const problem = rules.email(ADMIN_EMAIL) || rules.password(ADMIN_PASSWORD);
    if (problem) throw new Error(`ADMIN_EMAIL/ADMIN_PASSWORD invalid: ${problem}`);

    const email = normalizeEmail(ADMIN_EMAIL);
    if (await userModel.findByEmail(email)) {
      console.log(`Admin ${email} already exists. Nothing to do.`);
    } else {
      await userModel.create({ email, passwordHash: await hashPassword(ADMIN_PASSWORD), role: 'admin' });
      console.log(`Admin created: ${email}`);
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
