-- ============================================================
-- DEVELOPMENT SEED DATA
--
-- Тестовые данные только для локальной разработки.
-- Не использовать как production-данные.
-- ============================================================

BEGIN;


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
-- $argon2id$v=19$m=65536,p=4,t=3$WVk4PBQmtFLEua72ZeZQnw$LggQCGP80VmixuJhxunmMg2z1SR0cdG+zmMS9Db1ZCU пока является заглушкой.
-- Через настоящую авторизацию этим пользователем входить нельзя.
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
    '$argon2id$v=19$m=65536,p=4,t=3$WVk4PBQmtFLEua72ZeZQnw$LggQCGP80VmixuJhxunmMg2z1SR0cdG+zmMS9Db1ZCU',
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
-- $argon2id$v=19$m=65536,p=4,t=3$/QqMqePOoo86TtNtKwyWGQ$tgZBZcxzF1YoiowG3aO4cQZf6rmwb6f4Wn9kFhHT1TI
-- Через настоящую авторизацию этим пользователем входить нельзя.
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
    '$argon2id$v=19$m=65536,p=4,t=3$/QqMqePOoo86TtNtKwyWGQ$tgZBZcxzF1YoiowG3aO4cQZf6rmwb6f4Wn9kFhHT1TI',
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