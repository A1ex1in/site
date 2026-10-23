-- ============================================================
-- DEVELOPMENT SEED DATA
--
-- Тестовые данные только для локальной разработки.
-- Не использовать как production-данные.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Тестовый администратор
-- Email: admin@example.local
-- Пароль: Admin123!
-- ------------------------------------------------------------

INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    role,
    status
)
SELECT
    'admin@example.local',
    '$argon2id$v=19$m=65536,p=4,t=3$HMZ1lEg7Al3QBAzPycp95Q$oWapGu0rZiz3qaowX/eyu9ruzo1ki4aMmbicY4RB5ro',
    'Администратор',
    'Системы',
    'admin',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER(email) = LOWER('admin@example.local')
);


-- ------------------------------------------------------------
-- Учебная группа
-- ------------------------------------------------------------

INSERT INTO student_groups (
    name,
    description
)
SELECT
    'АТ-231',
    'Учебная группа АТ-231'
WHERE NOT EXISTS (
    SELECT 1
    FROM student_groups
    WHERE name = 'АТ-231'
);


-- ------------------------------------------------------------
-- Тестовый преподаватель
-- Email: teacher@example.local
-- Пароль: Teacher123!
-- Хеш ниже создан Argon2id и пригоден только для локальных тестовых данных.
-- ------------------------------------------------------------

INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    middle_name,
    role,
    status
)
SELECT
    'teacher@example.local',
    '$argon2id$v=19$m=65536,p=4,t=3$9bp+Gp3fFTUky1uJwRj1pw$YNJ5oW0bX8uJyd63HpXRpzlVoRO3XAOJP4r+OxkFVwM',
    'Ирина',
    'Иванова',
    'Ивановна',
    'teacher',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER(email) = LOWER('teacher@example.local')
);


-- ------------------------------------------------------------
-- Тестовый студент
-- Email: student@example.local
-- Пароль: Student123!
-- Хеш ниже создан Argon2id и пригоден только для локальных тестовых данных.
-- ------------------------------------------------------------

INSERT INTO users (
    email,
    password_hash,
    first_name,
    last_name,
    middle_name,
    role,
    status
)
SELECT
    'student@example.local',
    '$argon2id$v=19$m=65536,p=4,t=3$0upfW4wTVj0bIIVoOq4C7g$vF6TZarfqZLOW59i8Z3jqA6UzyE/yR35CoIrpf+MdKU',
    'Иван',
    'Петров',
    'Сергеевич',
    'student',
    'active'
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE LOWER(email) = LOWER('student@example.local')
);


-- ------------------------------------------------------------
-- Профиль тестового студента
-- ------------------------------------------------------------

INSERT INTO student_profiles (
    user_id,
    group_id,
    student_number
)
SELECT
    u.id,
    g.id,
    'АТ-231-001'
FROM users u
CROSS JOIN student_groups g
WHERE LOWER(u.email) = LOWER('student@example.local')
  AND g.name = 'АТ-231'
  AND NOT EXISTS (
      SELECT 1
      FROM student_profiles sp
      WHERE sp.user_id = u.id
  );


-- ------------------------------------------------------------
-- Дисциплина
-- ------------------------------------------------------------

INSERT INTO disciplines (
    name,
    code,
    description
)
SELECT
    'Микропроцессорные системы',
    'МПС',
    'Учебная дисциплина по микропроцессорным системам'
WHERE NOT EXISTS (
    SELECT 1
    FROM disciplines
    WHERE code = 'МПС'
);


-- ------------------------------------------------------------
-- Учебный курс
-- ------------------------------------------------------------

INSERT INTO courses (
    discipline_id,
    group_id,
    teacher_id,
    academic_year,
    semester
)
SELECT
    d.id,
    g.id,
    u.id,
    '2026/2027',
    1
FROM disciplines d
CROSS JOIN student_groups g
CROSS JOIN users u
WHERE d.code = 'МПС'
  AND g.name = 'АТ-231'
  AND LOWER(u.email) = LOWER('teacher@example.local')
  AND NOT EXISTS (
      SELECT 1
      FROM courses c
      WHERE c.discipline_id = d.id
        AND c.group_id = g.id
        AND c.teacher_id = u.id
        AND c.academic_year = '2026/2027'
        AND c.semester = 1
  );


COMMIT;
