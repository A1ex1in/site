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


-- ------------------------------------------------------------
-- Полная структура демонстрационного курса
-- Курс -> модули -> занятия -> материалы и задания
-- ------------------------------------------------------------

WITH target_course AS (
    SELECT c.id
    FROM courses c
    JOIN disciplines d ON d.id = c.discipline_id
    JOIN student_groups g ON g.id = c.group_id
    WHERE d.code = 'МПС'
      AND g.name = 'АТ-231'
      AND c.academic_year = '2026/2027'
      AND c.semester = 1
    LIMIT 1
)
INSERT INTO course_modules (course_id, title, description, sort_order)
SELECT target_course.id, module.title, module.description, module.sort_order
FROM target_course
CROSS JOIN (VALUES
    ('Основы микропроцессорных систем', 'Базовые понятия, системы счисления и принципы работы процессора.', 0),
    ('Архитектура и программирование', 'Архитектура микроконтроллеров и основы низкоуровневого программирования.', 1),
    ('Практический проект', 'Проектирование и защита собственного устройства.', 2)
) AS module(title, description, sort_order)
WHERE NOT EXISTS (
    SELECT 1
    FROM course_modules existing
    WHERE existing.course_id = target_course.id
      AND existing.title = module.title
);

WITH target_course AS (
    SELECT c.id
    FROM courses c
    JOIN disciplines d ON d.id = c.discipline_id
    JOIN student_groups g ON g.id = c.group_id
    WHERE d.code = 'МПС'
      AND g.name = 'АТ-231'
      AND c.academic_year = '2026/2027'
      AND c.semester = 1
    LIMIT 1
), lesson_data AS (
    SELECT * FROM (VALUES
        ('Основы микропроцессорных систем', DATE '2026-10-26', 'Лекция', 'Введение в микропроцессорные системы', 0),
        ('Основы микропроцессорных систем', DATE '2026-10-29', 'Практическое занятие', 'Системы счисления и представление данных', 1),
        ('Архитектура и программирование', DATE '2026-11-02', 'Лекция', 'Архитектура микроконтроллера', 0),
        ('Архитектура и программирование', DATE '2026-11-05', 'Лабораторная работа', 'Первая программа для микроконтроллера', 1),
        ('Практический проект', DATE '2026-11-09', 'Практическое занятие', 'Проектирование микропроцессорного устройства', 0)
    ) AS source(module_title, lesson_date, lesson_type, topic, sort_order)
)
INSERT INTO lessons (course_id, module_id, lesson_date, lesson_type, topic, sort_order)
SELECT target_course.id, module.id, lesson_data.lesson_date, lesson_data.lesson_type,
       lesson_data.topic, lesson_data.sort_order
FROM target_course
JOIN course_modules module ON module.course_id = target_course.id
JOIN lesson_data ON lesson_data.module_title = module.title
WHERE NOT EXISTS (
    SELECT 1
    FROM lessons existing
    WHERE existing.course_id = target_course.id
      AND existing.topic = lesson_data.topic
);

WITH target_course AS (
    SELECT c.id
    FROM courses c
    JOIN disciplines d ON d.id = c.discipline_id
    JOIN student_groups g ON g.id = c.group_id
    WHERE d.code = 'МПС'
      AND g.name = 'АТ-231'
      AND c.academic_year = '2026/2027'
      AND c.semester = 1
    LIMIT 1
), material_data AS (
    SELECT * FROM (VALUES
        ('Введение в микропроцессорные системы', 'Конспект: основы микропроцессоров', 'Основные определения, назначение и области применения микропроцессорных систем.', 'lecture', 0),
        ('Системы счисления и представление данных', 'Памятка по системам счисления', 'Примеры перевода чисел и представления данных в памяти.', 'methodical', 0),
        ('Архитектура микроконтроллера', 'Архитектура микроконтроллера', 'Презентация по основным узлам и интерфейсам микроконтроллера.', 'presentation', 0),
        ('Первая программа для микроконтроллера', 'Подготовка среды разработки', 'Инструкция по созданию, сборке и запуску первого проекта.', 'methodical', 0),
        ('Проектирование микропроцессорного устройства', 'Рекомендации к итоговому проекту', 'Требования к структуре, оформлению и защите проекта.', 'methodical', 0)
    ) AS source(lesson_topic, title, description, material_type, sort_order)
)
INSERT INTO materials (
    course_id, lesson_id, title, description, material_type, sort_order, is_published
)
SELECT target_course.id, lesson.id, material_data.title, material_data.description,
       material_data.material_type, material_data.sort_order, TRUE
FROM target_course
JOIN lessons lesson ON lesson.course_id = target_course.id
JOIN material_data ON material_data.lesson_topic = lesson.topic
WHERE NOT EXISTS (
    SELECT 1
    FROM materials existing
    WHERE existing.course_id = target_course.id
      AND existing.title = material_data.title
);

WITH target_course AS (
    SELECT c.id
    FROM courses c
    JOIN disciplines d ON d.id = c.discipline_id
    JOIN student_groups g ON g.id = c.group_id
    WHERE d.code = 'МПС'
      AND g.name = 'АТ-231'
      AND c.academic_year = '2026/2027'
      AND c.semester = 1
    LIMIT 1
), assignment_data AS (
    SELECT * FROM (VALUES
        ('Системы счисления и представление данных', 'Проверочная работа: системы счисления', 'Решите предложенные задания и приложите файл с ходом решения.', TIMESTAMPTZ '2026-11-01 23:00:00+06', 10.00::NUMERIC, 1),
        ('Первая программа для микроконтроллера', 'Практическая работа: первая программа', 'Создайте проект, соберите его и приложите исходный код с кратким пояснением.', TIMESTAMPTZ '2026-11-08 23:00:00+06', 15.00::NUMERIC, 1),
        ('Проектирование микропроцессорного устройства', 'Итоговый мини-проект', 'Подготовьте схему устройства, программу и пояснительную записку.', TIMESTAMPTZ '2026-11-20 23:00:00+06', 30.00::NUMERIC, 1)
    ) AS source(lesson_topic, title, description, deadline, max_score, sort_order)
)
INSERT INTO assignments (
    course_id, lesson_id, title, description, deadline, max_score,
    sort_order, is_published, published_at
)
SELECT target_course.id, lesson.id, assignment_data.title, assignment_data.description,
       assignment_data.deadline, assignment_data.max_score, assignment_data.sort_order,
       TRUE, CURRENT_TIMESTAMP
FROM target_course
JOIN lessons lesson ON lesson.course_id = target_course.id
JOIN assignment_data ON assignment_data.lesson_topic = lesson.topic
WHERE NOT EXISTS (
    SELECT 1
    FROM assignments existing
    WHERE existing.course_id = target_course.id
      AND existing.title = assignment_data.title
);

INSERT INTO grade_items (
    course_id, lesson_id, assignment_id, title, item_type,
    grade_date, max_score, sort_order
)
SELECT assignment.course_id, assignment.lesson_id, assignment.id, assignment.title,
       'assignment', assignment.deadline::date, assignment.max_score, assignment.sort_order
FROM assignments assignment
JOIN courses course ON course.id = assignment.course_id
JOIN disciplines discipline ON discipline.id = course.discipline_id
WHERE discipline.code = 'МПС'
  AND assignment.is_published = TRUE
  AND NOT EXISTS (
      SELECT 1
      FROM grade_items existing
      WHERE existing.assignment_id = assignment.id
  );


COMMIT;
