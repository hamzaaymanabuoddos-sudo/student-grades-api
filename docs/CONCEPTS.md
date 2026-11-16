# Concepts: what, why, how, when

## 1. Request lifecycle (example: teacher grades a student)
```
PUT /api/courses/2/students/5/grade   body {"grade": 92}
  -> logger                 starts a timer
  -> cors                   adds CORS headers
  -> express.json           body -> req.body
  -> cookieParser           Cookie header -> req.cookies
  -> route match            courseRoutes.js
  -> authMiddleware         verify JWT from cookie, load user -> req.user        (401 if it fails)
  -> authorizeRole          is role teacher/admin?                               (403 if not)
  -> authorizeCourseTeacher load course 2, is req.user.teacherId === course.teacher_id? (404/403)
  -> controller.setGrade    validate grade, student exists, student enrolled     (400/404)
  -> model                  UPDATE enrollments SET grade = $1 ... (parameterized)
  -> PostgreSQL             CHECK constraint is the last safety net
  -> controller             sends JSON
  -> logger                 prints "PUT ... -> 200 (12ms)"
```
Rules: routes hold no logic; controllers hold no SQL; models never touch `req`/`res`.

## 2. 401 vs 403
- **401 Unauthorized** = "I don't know who you are" (no token, bad token, expired token).
- **403 Forbidden** = "I know who you are, and you may not do this" (student grading, Teacher 7 grading Teacher 5's course).

## 3. Authentication vs authorization
- Authentication = identity (`authMiddleware`).
- Authorization level 1 = role (`authorizeRole`, `authorizeSelfOrAdmin`).
- Authorization level 2 = ownership of a specific resource (`authorizeCourseTeacher`). The decision lives in the pure function `canManageCourse(user, course)`; read it first to understand the rule.

## 4. JWT in a cookie vs the Authorization header
| | HttpOnly cookie (chosen) | `Authorization: Bearer` header |
|---|---|---|
| JS can read the token | No (XSS cannot steal it) | Yes (usually kept in localStorage) |
| Sent automatically | Yes, by the browser | No, the frontend must add it |
| CSRF risk | Yes -> mitigated with `SameSite` | None |
| CORS | Needs `credentials: true` + exact origin | Simple |
| Best for | Browser apps | Mobile apps, third-party API clients |

Chosen: cookie, because the main client is a browser and XSS token theft is the bigger risk for a learning project. `SameSite=Lax` blocks cross-site POST/PUT/DELETE from carrying the cookie, which covers the common CSRF cases. A production app serving cross-site frontends would add CSRF tokens.

The JWT payload only holds `sub` (user id) and `role`. It is *signed*, not encrypted, so never put secrets in it. Even so, `authMiddleware` re-reads the user and role from the database on each request, so deleted users or changed roles take effect immediately.

Logout: JWTs are stateless, so the server clears the cookie. (A stolen token stays valid until it expires; that is why `JWT_EXPIRES_IN` is short.)

## 5. CORS
- **What:** a browser rule that stops a page on origin A reading responses from origin B unless B opts in.
- **Why:** a future frontend (e.g. `http://localhost:5173`) calls this API (`http://localhost:3000`). Postman ignores CORS because it is not a browser.
- **Cookies:** need (1) `credentials: true` on the server, (2) an exact origin, never `*`, (3) `fetch(..., { credentials: 'include' })` on the client. Allowed origins come from `CLIENT_ORIGINS`.
- Cross-site cookies (`COOKIE_SAMESITE=none`) additionally require HTTPS (`Secure`).

## 6. Database constraints and why
| Constraint | Where | Why |
|---|---|---|
| PRIMARY KEY | every `id` | unique row identity |
| UNIQUE | `users.email`, `students.student_no`, `courses.code`, `UNIQUE(student_id, course_id)` | no duplicates, including duplicate enrollment |
| UNIQUE on `user_id` | students, teachers | makes user -> profile strictly 1:1 |
| NOT NULL | required columns, `courses.teacher_id` | "a course must have a teacher" |
| CHECK | role list, grade 0..100, credit 1..6, code/student_no format, lower-case email | bad data is impossible even if app code has a bug |
| FK `ON DELETE CASCADE` | profiles -> users, enrollments -> students | a child row is meaningless without its parent |
| FK `ON DELETE RESTRICT` | courses -> teachers, enrollments -> courses | never silently destroy courses/grades; returns 409 |

Email is stored only in `users` (normalization): one fact, one place.

## 7. Transactions: when are they really needed?
Needed only when **several writes must succeed or fail together**:
- Registering/creating a student or teacher (`users` + profile). Without it a failed second insert leaves an orphan user (the test plan proves it rolls back).
- Updating email (in `users`) and name (in `students`) together.
- The demo seed.

NOT used for a single `INSERT/UPDATE/DELETE` (one statement is already atomic) or for pure reads. See `withTransaction` in `src/config/db.js`.

## 8. SQL used and where
- JOIN / INNER JOIN: `studentModel`, `courseModel.findStudents`, `enrollmentModel`.
- LEFT JOIN: `userModel.findByIdWithProfile` (admins have no profile), `courseModel.findByTeacherId` (courses with 0 students still show).
- COUNT / AVG / MIN / MAX / GROUP BY: `courseModel.statsPerCourse`, `userModel.countByRole`, `enrollmentModel.transcriptSummary`.
- ORDER BY / LIMIT / OFFSET: all list endpoints. ILIKE search: `studentModel.list`.
- `COALESCE($1, column)`: partial updates. `RETURNING`: get the written row back.
- Parameterized queries (`$1, $2`) everywhere: user input is sent separately from the SQL text, so SQL injection is impossible.

## 9. Transcript math
```
Simple average   = AVG(grade)                         over graded courses
Weighted average = SUM(grade x credit_hours) / SUM(credit_hours)   over graded courses
```
Example: 90 (3 cr), 85 (3 cr), 92 (3 cr) -> (270 + 255 + 276) / 9 = 89.0. Courses without a grade are excluded from both. A 4.0 GPA scale would need a grade-to-points table; that is a good extension.

## 10. Security checklist (implemented)
Passwords hashed with bcrypt (never stored/returned) - JWT with minimal payload and pinned HS256 - HttpOnly + SameSite (+ Secure in production) cookie - secrets in env vars with startup validation - role and ownership checks - parameterized SQL - strict CORS allow-list - same message for unknown email and wrong password - registration cannot choose a role - body size limit - no stack traces to clients in production - `x-powered-by` disabled.
Not covered (future work): rate limiting on login, CSRF tokens, refresh tokens, helmet, audit logs.

## 11. date-fns
Used for the request-log timestamp and the transcript `generatedAt`. Timestamps themselves (`created_at`, `updated_at`) are produced by PostgreSQL (`now()`), which is the better place for them.
