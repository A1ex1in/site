-- Добавляет роль администратора и настоящий учёт посещаемости.
-- Скрипт идемпотентен и подходит для существующей базы.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS lesson_attendance (
    lesson_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    status attendance_status NOT NULL,
    marked_by BIGINT NOT NULL,
    comment VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lesson_id, student_id),
    CONSTRAINT fk_attendance_lesson
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_teacher
        FOREIGN KEY (marked_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS lesson_attendance_student_idx
ON lesson_attendance (student_id, status);
