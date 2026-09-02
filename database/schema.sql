-- ============================================================
-- DATABASE SCHEMA
-- Учебная система преподаватель <-> студент
-- ============================================================


-- ------------------------------------------------------------
-- Пользовательские типы
-- ------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
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
    title VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(50) NOT NULL DEFAULT 'other',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_material_course
        FOREIGN KEY (course_id)
        REFERENCES courses(id)
        ON DELETE CASCADE,

    CONSTRAINT material_type_check
        CHECK (
            material_type IN (
                'lecture',
                'presentation',
                'methodical',
                'other'
            )
        )
);


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
