-- ============================================================
-- DATABASE SCHEMA
-- Учебная система преподаватель <-> студент
-- ============================================================


-- ------------------------------------------------------------
-- Пользовательские типы
-- ------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'admin',
    'teacher',
    'student'
);

CREATE TYPE user_status AS ENUM (
    'pending',
    'active',
    'rejected',
    'blocked'
);


-- ------------------------------------------------------------
-- Пользователи
-- ------------------------------------------------------------

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),

    phone VARCHAR(30),

    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Email уникален без учёта регистра
CREATE UNIQUE INDEX users_email_unique
ON users (LOWER(email));

CREATE INDEX users_role_status_idx
ON users (role, status);


-- ------------------------------------------------------------
-- Зафиксированные согласия с юридическими документами
-- ------------------------------------------------------------

CREATE TABLE legal_consents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(50) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent VARCHAR(500),

    CONSTRAINT fk_legal_consent_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT legal_consent_document_type_check
        CHECK (document_type IN ('privacy_policy', 'user_agreement')),

    CONSTRAINT legal_consent_unique
        UNIQUE (user_id, document_type, document_version)
);

CREATE INDEX legal_consents_user_idx
ON legal_consents (user_id, accepted_at DESC);


-- ------------------------------------------------------------
-- Учебные группы
-- ------------------------------------------------------------

CREATE TABLE student_groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- Профили студентов
-- ------------------------------------------------------------

CREATE TABLE student_profiles (
    user_id BIGINT PRIMARY KEY,

    group_id BIGINT,
    student_number VARCHAR(50),

    CONSTRAINT fk_student_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_student_group
        FOREIGN KEY (group_id)
        REFERENCES student_groups(id)
        ON DELETE SET NULL,

    CONSTRAINT student_number_unique
        UNIQUE (student_number)
);

CREATE INDEX student_profiles_group_idx
ON student_profiles (group_id);


-- ------------------------------------------------------------
-- Дисциплины
-- ------------------------------------------------------------

CREATE TABLE disciplines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- Учебные курсы
--
-- Связывает:
-- дисциплина + группа + преподаватель + учебный год + семестр
-- ------------------------------------------------------------

CREATE TABLE courses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    discipline_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,

    academic_year VARCHAR(9) NOT NULL,
    semester SMALLINT NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_course_discipline
        FOREIGN KEY (discipline_id)
        REFERENCES disciplines(id),

    CONSTRAINT fk_course_group
        FOREIGN KEY (group_id)
        REFERENCES student_groups(id),

    CONSTRAINT fk_course_teacher
        FOREIGN KEY (teacher_id)
        REFERENCES users(id),

    CONSTRAINT semester_check
        CHECK (semester IN (1, 2)),

    CONSTRAINT course_unique
        UNIQUE (
            discipline_id,
            group_id,
            teacher_id,
            academic_year,
            semester
        )
);

CREATE INDEX courses_teacher_idx
ON courses (teacher_id, is_active);

CREATE INDEX courses_group_idx
ON courses (group_id, is_active);

-- ------------------------------------------------------------
-- Модули учебного курса
-- ------------------------------------------------------------
CREATE TABLE course_modules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_course_module_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE CASCADE
);

CREATE INDEX course_modules_course_order_idx
ON course_modules (course_id, sort_order, id);

-- ------------------------------------------------------------
-- Учебные занятия
-- ------------------------------------------------------------
CREATE TABLE lessons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL,
  module_id BIGINT,
  lesson_date DATE NOT NULL,
  lesson_type VARCHAR(50) NOT NULL,
  topic VARCHAR(255),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_lesson_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_lesson_module
    FOREIGN KEY (module_id)
    REFERENCES course_modules(id)
    ON DELETE SET NULL
);

CREATE INDEX lessons_course_date_idx
ON lessons (course_id, lesson_date);

CREATE INDEX lessons_module_order_idx
ON lessons (module_id, sort_order, lesson_date, id);

-- ------------------------------------------------------------
-- Посещаемость занятий
-- ------------------------------------------------------------
CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'excused'
);

CREATE TABLE lesson_attendance (
    lesson_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    status attendance_status NOT NULL,
    marked_by BIGINT NOT NULL,
    comment VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (lesson_id, student_id),

    CONSTRAINT fk_attendance_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id)
        REFERENCES student_profiles(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attendance_teacher
        FOREIGN KEY (marked_by)
        REFERENCES users(id)
);

CREATE INDEX lesson_attendance_student_idx
ON lesson_attendance (student_id, status);

-- ------------------------------------------------------------
-- Сессии пользователей
-- ------------------------------------------------------------

CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX user_sessions_expire_idx
ON user_sessions (expire);


-- ------------------------------------------------------------
-- Учебные материалы
-- ------------------------------------------------------------

CREATE TABLE materials (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT NOT NULL,
    lesson_id BIGINT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) NOT NULL DEFAULT 'other',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_material_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_material_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons(id)
        ON DELETE SET NULL,

    CONSTRAINT material_type_check
        CHECK (
            material_type IN (
                'lecture',
                'presentation',
                'methodical',
                'self_study',
                'other'
            )
        )
);

CREATE INDEX materials_course_idx
ON materials (course_id, is_published);

CREATE INDEX materials_lesson_order_idx
ON materials (lesson_id, sort_order, id);


-- ------------------------------------------------------------
-- Файлы учебных материалов
-- ------------------------------------------------------------

CREATE TABLE material_files (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    material_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,

    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_material_file_material
        FOREIGN KEY (material_id)
        REFERENCES materials(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_material_file_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id),

    CONSTRAINT material_file_size_check
        CHECK (size_bytes >= 0)
);

CREATE INDEX material_files_material_idx
ON material_files (material_id);

-- ------------------------------------------------------------
-- Учебные задания
-- ------------------------------------------------------------

CREATE TABLE assignments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id BIGINT NOT NULL,
    lesson_id BIGINT,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    deadline TIMESTAMPTZ,
    max_score NUMERIC(6,2) NOT NULL DEFAULT 5,
    sort_order INTEGER NOT NULL DEFAULT 0,

    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_lesson
        FOREIGN KEY (lesson_id)
        REFERENCES lessons(id)
        ON DELETE SET NULL,

    CONSTRAINT assignment_max_score_check
        CHECK (max_score > 0)
);

CREATE INDEX assignments_course_idx
ON assignments (course_id);

CREATE INDEX assignments_lesson_order_idx
ON assignments (lesson_id, sort_order, id);

-- ------------------------------------------------------------
-- Оцениваемые элементы журнала
-- ------------------------------------------------------------
CREATE TABLE grade_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL,
  lesson_id BIGINT,
  assignment_id BIGINT,

  title VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  grade_date DATE NOT NULL,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 5,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_grade_item_course
    FOREIGN KEY (course_id)
    REFERENCES courses(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_grade_item_lesson
    FOREIGN KEY (lesson_id)
    REFERENCES lessons(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_grade_item_assignment
    FOREIGN KEY (assignment_id)
    REFERENCES assignments(id)
    ON DELETE SET NULL,

  CONSTRAINT grade_item_max_score_check
    CHECK (max_score > 0),

  CONSTRAINT grade_item_assignment_unique
    UNIQUE (assignment_id)
);

CREATE INDEX grade_items_course_date_idx
ON grade_items (course_id, grade_date);

CREATE INDEX grade_items_lesson_idx
ON grade_items (lesson_id);

-- ------------------------------------------------------------
-- Оценки студентов
-- ------------------------------------------------------------
CREATE TABLE grades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  grade_item_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  comment TEXT,
  graded_by BIGINT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_grade_item
    FOREIGN KEY (grade_item_id)
    REFERENCES grade_items(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_grade_student
    FOREIGN KEY (student_id)
    REFERENCES student_profiles(user_id)
    ON DELETE CASCADE,

  CONSTRAINT fk_grade_teacher
    FOREIGN KEY (graded_by)
    REFERENCES users(id),

  CONSTRAINT grade_score_check
    CHECK (score >= 0),

  CONSTRAINT grade_unique
    UNIQUE (grade_item_id, student_id)
);

CREATE INDEX grades_student_idx
ON grades (student_id);

CREATE INDEX grades_item_idx
ON grades (grade_item_id);

-- ------------------------------------------------------------
-- Файлы учебных заданий
-- ------------------------------------------------------------

CREATE TABLE assignment_files (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    assignment_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,

    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_file_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_file_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id),

    CONSTRAINT assignment_file_size_check
        CHECK (size_bytes >= 0)
);

CREATE INDEX assignment_files_assignment_idx
ON assignment_files (assignment_id);

-- ------------------------------------------------------------
-- Файлы материалов, прикреплённые к заданиям
-- ------------------------------------------------------------

CREATE TABLE assignment_material_files (
    assignment_id BIGINT NOT NULL,
    material_file_id BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (assignment_id, material_file_id),

    CONSTRAINT fk_assignment_material_file_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_assignment_material_file_file
        FOREIGN KEY (material_file_id)
        REFERENCES material_files(id)
        ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Статусы работ студентов
-- ------------------------------------------------------------

CREATE TYPE submission_status AS ENUM (
    'draft',
    'submitted',
    'returned',
    'graded'
);

-- ------------------------------------------------------------
-- Работы студентов
-- ------------------------------------------------------------

CREATE TABLE student_submissions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    assignment_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,

    status submission_status NOT NULL DEFAULT 'draft',

    student_comment TEXT,
    submitted_at TIMESTAMPTZ,

    teacher_comment TEXT,
    checked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submission_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_submission_student
        FOREIGN KEY (student_id)
        REFERENCES student_profiles(user_id)
        ON DELETE CASCADE,

    CONSTRAINT submission_unique
        UNIQUE (assignment_id, student_id),

    CONSTRAINT submission_submitted_at_check
        CHECK (
            (status = 'draft' AND submitted_at IS NULL)
            OR
            (status IN ('submitted', 'returned', 'graded') AND submitted_at IS NOT NULL)
        )
);

CREATE INDEX student_submissions_student_idx
ON student_submissions (student_id);

CREATE INDEX student_submissions_assignment_idx
ON student_submissions (assignment_id, status);

-- ------------------------------------------------------------
-- Файлы работ студентов
-- ------------------------------------------------------------

CREATE TABLE submission_files (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    submission_id BIGINT NOT NULL,
    uploaded_by BIGINT NOT NULL,

    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL UNIQUE,
    storage_key TEXT NOT NULL UNIQUE,
    mime_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submission_file_submission
        FOREIGN KEY (submission_id)
        REFERENCES student_submissions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_submission_file_uploader
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id),

    CONSTRAINT submission_file_size_check
        CHECK (size_bytes >= 0)
);

CREATE INDEX submission_files_submission_idx
ON submission_files (submission_id);
