# Student Grades Management System (API)

An educational backend for a university: students, teachers, courses, enrollments and grades.
Built with **Node.js, Express 4, PostgreSQL (`pg`, no ORM)**, CommonJS.

**Core business rule:** a teacher can enter or modify grades only for students enrolled in courses *they* are responsible for.

## Technologies
| Package | Why it is here |
|---|---|
| `express` | HTTP server and routing |
| `pg` | PostgreSQL driver (`Pool`, parameterized queries, transactions) |
| `dotenv` | Load configuration from `.env` |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | Create/verify JWTs |
| `cookie-parser` | Read the JWT from an HttpOnly cookie |
| `cors` | Controlled cross-origin access |
| `date-fns` | Timestamp formatting (request log, transcript `generatedAt`) |
| `nodemon` (dev) | Auto-restart during development |

No ORM, MongoDB, Redis, Docker or file-upload packages are used on purpose.

## Installation
```bash
npm install
cp .env.example .env        # then edit .env (a development .env is already included)
```

## Environment variables (`.env`)
| Variable | Meaning |
|---|---|
| `PORT` | Server port (default 3000) |
| `NODE_ENV` | `development` or `production` (production = Secure cookies, hidden 500 messages) |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USER` `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | Signing key (>= 32 chars in production). Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | e.g. `1h`, `7d` |
| `CLIENT_ORIGINS` | Comma-separated frontend origins allowed by CORS |
| `COOKIE_SAMESITE` | `lax` (default), `strict`, or `none` (cross-site + HTTPS) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used only by `npm run seed:admin` |

`.env` is git-ignored. **Never commit it.** Change the placeholder values before real use.

## Database setup
```bash
psql -U postgres -c "CREATE DATABASE student_grades_db;"
psql -U postgres -d student_grades_db -f schema.sql
npm run seed:admin      # creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD
npm run seed:demo       # optional: 2 teachers, 3 students, 3 courses, sample grades (password: Password123)
```

## Run
```bash
npm run dev     # nodemon
npm start       # plain node
```
Health check: `GET http://localhost:3000/api/health`

## Roles
| Role | Can |
|---|---|
| `student` | Log in, view **own** profile/courses/grades/transcript. Never modify grades. |
| `teacher` | View own profile and courses, see students of **own** courses, enter/modify grades for **own** courses. |
| `admin` | Manage students, teachers, courses, enrollments, users; view/modify any grade. |

Public registration creates **students only** (role is never read from the body). Teachers are created by an admin; the first admin comes from the seed script.

## Authentication
`POST /api/auth/login` verifies the password with bcrypt, then sets an **HttpOnly cookie** containing a JWT (`sub` = user id, `role`). Protected routes read that cookie. See `docs/CONCEPTS.md` for cookie vs. Authorization-header trade-offs.

## API endpoints
Success: `{ "success": true, "data": ... }` — Error: `{ "success": false, "message": "...", "details": {...} }`. List endpoints accept `?limit=&offset=`.

**Auth** (`/api/auth`)
| Method | Path | Access |
|---|---|---|
| POST | `/register` | Public (creates a student) |
| POST | `/login` | Public |
| POST | `/logout` | Public |
| GET | `/me` | Logged in |

**Students** (`/api/students`)
| Method | Path | Access |
|---|---|---|
| GET | `/?search=` | admin |
| POST | `/` | admin |
| GET | `/:id` | admin, or that student |
| PUT / DELETE | `/:id` | admin |
| GET | `/:id/courses` | admin, or that student |
| GET | `/:id/transcript` | admin, or that student |

**Teachers** (`/api/teachers`)
| Method | Path | Access |
|---|---|---|
| GET, POST | `/` | admin |
| GET | `/:id` | admin, or that teacher |
| PUT / DELETE | `/:id` | admin |
| GET | `/:id/courses` | admin, or that teacher |

**Courses** (`/api/courses`)
| Method | Path | Access |
|---|---|---|
| GET | `/`, `/:id` | any logged-in user |
| POST / PUT / DELETE | `/`, `/:id` | admin |
| GET | `/:id/students` | responsible teacher, admin |
| PUT | `/:courseId/students/:studentId/grade` body `{ "grade": 90 }` | responsible teacher, admin |
| DELETE | `/:courseId/students/:studentId/grade` (clears grade) | responsible teacher, admin |
| GET | `/:courseId/students/:studentId/grade` | that student, responsible teacher, admin |

**Enrollments** (`/api/enrollments`) — admin only: `GET /?studentId=&courseId=`, `POST /` `{studentId, courseId}`, `PUT /:id` `{grade}`, `DELETE /:id`

**Admin** (`/api/admin`) — admin only: `GET /users`, `GET /users/:id`, `DELETE /users/:id`, `POST /admins`, `GET /stats`

## Project structure
```
student-grades-api/
├── schema.sql                  database schema with constraints explained
├── scripts/                    seedAdmin.js, seedDemo.js
├── docs/                       CONCEPTS.md, POSTMAN_TESTING.md, GIT_GUIDE.md
└── src/
    ├── config/                 env.js (validated env vars), db.js (pg Pool + transactions), cors.js
    ├── routes/                 URL -> middleware chain -> controller
    ├── middlewares/            logger, authMiddleware, authorizeRole, authorizeCourseTeacher, errorMiddleware
    ├── controllers/            HTTP in/out, validation, orchestration
    ├── models/                 SQL only
    ├── utils/                  AppError, asyncHandler, validators, password, token, response
    ├── app.js                  middleware order + route mounting
    └── server.js               DB check + listen + graceful shutdown
```

## Documentation
- `docs/CONCEPTS.md` — architecture, request lifecycle, auth, authorization, SQL, transactions, CORS, security
- `docs/POSTMAN_TESTING.md` — the 12-step test plan
- `docs/GIT_GUIDE.md` — Git/GitHub workflow for this repo
