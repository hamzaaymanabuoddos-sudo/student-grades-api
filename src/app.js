// Builds the Express application (middleware order matters!). server.js starts it.
const express = require('express');
const cookieParser = require('cookie-parser');

const corsMiddleware = require('./config/cors');
const logger = require('./middlewares/logger');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.disable('x-powered-by');          // don't advertise the framework
app.use(logger);                      // 1. log every request
app.use(corsMiddleware);              // 2. CORS headers (also answers browser preflight OPTIONS)
app.use(express.json({ limit: '100kb' })); // 3. parse JSON bodies -> req.body
app.use(cookieParser());              // 4. parse Cookie header -> req.cookies

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);     // no route matched -> 404
app.use(errorHandler); // must be LAST: catches every error passed to next(err)

module.exports = app;
