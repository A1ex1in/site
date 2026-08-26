-- ============================================================
-- DEVELOPMENT DATABASE RESET
--
-- НЕ ИСПОЛЬЗОВАТЬ В PRODUCTION
--
-- Полностью очищает данные разработки,
-- но НЕ удаляет структуру БД.
--
-- После выполнения:
--   1. запустить seed.sql
--   2. запустить checks.sql
--
-- НЕ использовать в production.
-- ============================================================

BEGIN;

TRUNCATE TABLE
    user_sessions,
    courses,
    student_profiles,
    disciplines,
    student_groups,
    users
RESTART IDENTITY
CASCADE;

COMMIT;

/*
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
*/
