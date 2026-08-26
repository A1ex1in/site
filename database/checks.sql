-- ============================================================
-- DATABASE CHECKS
--
-- Проверка тестовых данных и основных связей.
-- Ничего в базе не изменяет.
-- ============================================================


WITH checks AS (

    -- --------------------------------------------------------
    -- 1. Группа
    -- --------------------------------------------------------

    SELECT
        1 AS sort_order,
        'Группа АТ-231 создана' AS check_name,

        EXISTS (
            SELECT 1
            FROM student_groups
            WHERE name = 'АТ-231'
        ) AS ok


    UNION ALL


    -- --------------------------------------------------------
    -- 2. Преподаватель
    -- --------------------------------------------------------

    SELECT
        2,
        'Преподаватель создан',

        EXISTS (
            SELECT 1
            FROM users
            WHERE LOWER(email) =
                  LOWER('teacher@example.local')
              AND role = 'teacher'
              AND status = 'active'
        )


    UNION ALL


    -- --------------------------------------------------------
    -- 3. Студент
    -- --------------------------------------------------------

    SELECT
        3,
        'Студент создан',

        EXISTS (
            SELECT 1
            FROM users
            WHERE LOWER(email) =
                  LOWER('student@example.local')
              AND role = 'student'
              AND status = 'active'
        )


    UNION ALL


    -- --------------------------------------------------------
    -- 4. Профиль студента и группа
    -- --------------------------------------------------------

    SELECT
        4,
        'Студент привязан к группе АТ-231',

        EXISTS (
            SELECT 1

            FROM student_profiles sp

            JOIN users u
                ON u.id = sp.user_id

            JOIN student_groups g
                ON g.id = sp.group_id

            WHERE LOWER(u.email) =
                  LOWER('student@example.local')

              AND g.name = 'АТ-231'

              AND sp.student_number =
                  'АТ-231-001'
        )


    UNION ALL


    -- --------------------------------------------------------
    -- 5. Дисциплина
    -- --------------------------------------------------------

    SELECT
        5,
        'Дисциплина МПС создана',

        EXISTS (
            SELECT 1
            FROM disciplines

            WHERE code = 'МПС'

              AND name =
                  'Микропроцессорные системы'
        )


    UNION ALL


    -- --------------------------------------------------------
    -- 6. Учебный курс
    -- --------------------------------------------------------

    SELECT
        6,
        'Курс МПС для АТ-231 создан',

        EXISTS (
            SELECT 1

            FROM courses c

            JOIN disciplines d
                ON d.id = c.discipline_id

            JOIN student_groups g
                ON g.id = c.group_id

            JOIN users teacher
                ON teacher.id = c.teacher_id

            WHERE d.code = 'МПС'

              AND g.name = 'АТ-231'

              AND LOWER(teacher.email) =
                  LOWER('teacher@example.local')

              AND c.academic_year = '2026/2027'

              AND c.semester = 1
        )


    UNION ALL


    -- --------------------------------------------------------
    -- 7. Полная учебная цепочка
    --
    -- студент
    --     ↓
    -- группа
    --     ↓
    -- course
    --     ↓
    -- дисциплина + преподаватель
    -- --------------------------------------------------------

    SELECT
        7,
        'Полная учебная связь работает',

        EXISTS (
            SELECT 1

            FROM users student

            JOIN student_profiles sp
                ON sp.user_id = student.id

            JOIN student_groups sg
                ON sg.id = sp.group_id

            JOIN courses c
                ON c.group_id = sg.id

            JOIN disciplines d
                ON d.id = c.discipline_id

            JOIN users teacher
                ON teacher.id = c.teacher_id

            WHERE LOWER(student.email) =
                  LOWER('student@example.local')

              AND sg.name = 'АТ-231'

              AND d.code = 'МПС'

              AND LOWER(teacher.email) =
                  LOWER('teacher@example.local')

              AND c.academic_year = '2026/2027'

              AND c.semester = 1
        )
),


result AS (

    SELECT
        sort_order,
        check_name,
        ok
    FROM checks


    UNION ALL


    SELECT
        999,
        'ИТОГОВАЯ ПРОВЕРКА',
        BOOL_AND(ok)
    FROM checks
)


SELECT
    check_name AS "Проверка",

    CASE
        WHEN ok
            THEN 'OK'
        ELSE
            'ОШИБКА / НЕ НАЙДЕНО'
    END AS "Результат"

FROM result

ORDER BY sort_order;




-- ============================================================
-- DATABASE CLEAR
--
-- Удаляет все данные.
-- Ничего в базе не изменяет.
-- ============================================================

BEGIN;

TRUNCATE TABLE
    courses,
    student_profiles,
    disciplines,
    student_groups,
    users
RESTART IDENTITY
CASCADE;

COMMIT;


SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM student_groups;
SELECT COUNT(*) FROM student_profiles;
SELECT COUNT(*) FROM disciplines;
SELECT COUNT(*) FROM courses;


SELECT * FROM users;
SELECT * FROM student_groups;
SELECT * FROM student_profiles;
SELECT * FROM disciplines;
SELECT * FROM courses;