// Password hashing with bcryptjs.
// bcrypt = slow on purpose + random salt built in, so identical passwords produce different hashes
// and brute-forcing stolen hashes is expensive. 10 salt rounds is a common, reasonable default.
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;
const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = { hashPassword, comparePassword };
