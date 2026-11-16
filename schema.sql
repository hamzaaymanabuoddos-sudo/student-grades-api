-- =====================================================================
-- Student Grades Management System - PostgreSQL schema
-- Run with:  psql -U postgres -d student_grades_db -f schema.sql
-- (create the database first:  CREATE DATABASE student_grades_db;)
-- The script is idempotent: safe to run more than once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS: authentication + role. One row per login account.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,                       -- PRIMARY KEY: unique row identity
    email         VARCHAR(255) NOT NULL,                    -- NOT NULL: every account needs an email
    password_hash TEXT         NOT NULL,                    -- bcrypt hash, NEVER the plain password
    role          VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT users_email_key       UNIQUE (email),        -- UNIQUE: no two accounts share an email
    CONSTRAINT users_role_check      CHECK (role IN ('student', 'teacher', 'admin')),   -- CHECK: only valid roles
    CONSTRAINT users_email_lower     CHECK (email = lower(email))                       -- CHECK: avoids "A@x.com" vs "a@x.com" duplicates
);

-- ---------------------------------------------------------------------
-- STUDENTS: academic profile attached to a user account (1:1).
-- Email lives ONLY in users (normalization: one fact, one place).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL,
    student_no VARCHAR(20)  NOT NULL,
    full_name  VARCHAR(150) NOT NULL,
    -- ON DELETE CASCADE: if the login account is deleted, the profile has no meaning -> delete it too.
    CONSTRAINT students_user_fk       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT students_user_id_key   UNIQUE (user_id),     -- UNIQUE makes it 1:1 (one profile per user)
    CONSTRAINT students_student_no_key UNIQUE (student_no),
    CONSTRAINT students_student_no_format CHECK (student_no ~ '^[A-Z0-9]{4,20}$'),
    CONSTRAINT students_name_not_blank    CHECK (length(trim(full_name)) > 0)
);

-- ---------------------------------------------------------------------
-- TEACHERS: profile attached to a user account (1:1).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id        SERIAL PRIMARY KEY,
    user_id   INTEGER      NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    CONSTRAINT teachers_user_fk     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT teachers_user_id_key UNIQUE (user_id),
    CONSTRAINT teachers_name_not_blank CHECK (length(trim(full_name)) > 0)
);

-- ---------------------------------------------------------------------
-- COURSES: each course has exactly ONE responsible teacher (1 teacher : N courses).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(10)  NOT NULL,
    name         VARCHAR(150) NOT NULL,
    credit_hours INTEGER      NOT NULL,
    teacher_id   INTEGER      NOT NULL,                     -- NOT NULL: "a course must have a responsible teacher"
    -- ON DELETE RESTRICT: you cannot delete a teacher who still teaches courses.
    -- Silently deleting courses (and their grades) would be dangerous; force an explicit reassignment.
    CONSTRAINT courses_teacher_fk   FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE RESTRICT,
    CONSTRAINT courses_code_key     UNIQUE (code),
    CONSTRAINT courses_code_format  CHECK (code ~ '^[A-Z]{2,5}[0-9]{3}$'),
    CONSTRAINT courses_credit_range CHECK (credit_hours BETWEEN 1 AND 6),
    CONSTRAINT courses_name_not_blank CHECK (length(trim(name)) > 0)
);

-- ---------------------------------------------------------------------
-- ENROLLMENTS: junction table for the N:N relation students <-> courses.
-- The grade lives here: it belongs to ONE student in ONE course.
-- grade is NULL until a teacher enters it ("not graded yet").
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
    id         SERIAL PRIMARY KEY,
    student_id INTEGER       NOT NULL,
    course_id  INTEGER       NOT NULL,
    grade      NUMERIC(5,2),                                -- 0.00 .. 100.00, NULL allowed
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- CASCADE: deleting a student removes their enrollments.
    CONSTRAINT enrollments_student_fk FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    -- RESTRICT: a course with enrollments/grades cannot be deleted by accident.
    CONSTRAINT enrollments_course_fk  FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE RESTRICT,
    CONSTRAINT enrollments_student_id_course_id_key UNIQUE (student_id, course_id),  -- no duplicate enrollment
    CONSTRAINT enrollments_grade_range CHECK (grade >= 0 AND grade <= 100)           -- NULL passes CHECK, which is what we want
);

-- ---------------------------------------------------------------------
-- INDEXES: PostgreSQL indexes PRIMARY KEY and UNIQUE columns automatically,
-- but NOT foreign key columns. We join/filter on these often.
-- (enrollments.student_id is already covered by the UNIQUE(student_id, course_id) index.)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id    ON courses(teacher_id);
