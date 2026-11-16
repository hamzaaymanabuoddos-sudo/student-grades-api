# Postman test plan

Setup: run `npm run seed:admin` and `npm run seed:demo`, start the server, set a Postman variable `base = http://localhost:3000/api`.
Postman stores the cookie from `/auth/login` automatically (per domain), so later requests are authenticated.
Use **separate cookie contexts** per user: log in as one user, test, then log in as the next (this replaces the cookie), or use the Cookies manager to clear it.

All demo passwords: `Password123`. Admin: value of `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
Demo data: teacher1 owns CS101 (id 1) and CS201 (id 2); teacher2 owns CS301 (id 3). Hamza = student 1, Lina = 2, Yousef = 3.

| # | Test | Request | Expected |
|---|---|---|---|
| 1 | Register | `POST /auth/register` `{"email":"a@uni.edu","password":"Passw0rd1","fullName":"A B","studentNo":"S2025001"}` | 201, role student, no hash |
| 1b | Role injection | same body plus `"role":"admin"` | 201 but role is still student |
| 2 | Login / token | `POST /auth/login` | 200, `Set-Cookie: token=...; HttpOnly` |
| 3 | Protected route | `GET /auth/me` | 200 when logged in; 401 after `POST /auth/logout` |
| 4 | Student permissions | as Hamza: `GET /students/1/transcript` -> 200; `GET /students/2/transcript` -> 403; `GET /students` -> 403; `PUT /courses/1/students/1/grade` -> 403 |
| 5 | Teacher permissions | as teacher1: `GET /teachers/1/courses` -> 200; `GET /teachers/2/courses` -> 403; `GET /courses/1/students` -> 200; `POST /courses` -> 403 |
| 6 | Admin permissions | as admin: `GET /students`, `GET /admin/stats`, `POST /teachers`, `POST /courses`, `POST /enrollments` -> 2xx |
| 7 | Teacher grades own course | teacher1: `PUT /courses/1/students/1/grade` `{"grade":95}` | 200 |
| 8 | Teacher grades another's course | teacher1: `PUT /courses/3/students/1/grade` `{"grade":10}` | **403** |
| 9 | Invalid grades | `{"grade":150}`, `{"grade":-1}`, `{"grade":"abc"}`, `{}` | 400 each |
| 10 | Duplicate enrollment | admin: `POST /enrollments` `{"studentId":1,"courseId":1}` | 409 |
| 11 | Nonexistent records | grade for student 999 -> 404; course 999 -> 404; student 3 not in course 1 -> 404 "not enrolled"; enrollment with student 99 -> 404 |
| 12 | Invalid/expired JWT | set Cookie `token=garbage` -> 401 "Invalid token"; temporarily set `JWT_EXPIRES_IN=5s`, log in, wait, `GET /auth/me` -> 401 "Session expired" |

Extra checks: delete teacher1 while they own courses -> 409; delete a course with enrollments -> 409; duplicate course code -> 409; `PUT /enrollments/1` `{"grade":101}` -> 400; admin `DELETE /admin/users/<own id>` -> 400; malformed JSON -> 400; unknown URL -> 404.

Then verify the database safety net directly in psql: `UPDATE enrollments SET grade = 150 WHERE id = 1;` fails with `enrollments_grade_range`.
