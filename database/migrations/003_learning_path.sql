-- Добавляет структуру учебного пути: курс -> модуль -> занятие -> материал/задание.
-- Скрипт идемпотентен и сохраняет существующие данные.

CREATE TABLE IF NOT EXISTS course_modules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS course_modules_course_order_idx
ON course_modules (course_id, sort_order, id);

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module_id BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS lesson_id BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lesson_id BIGINT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lesson_module') THEN
    ALTER TABLE lessons
      ADD CONSTRAINT fk_lesson_module
      FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_material_lesson') THEN
    ALTER TABLE materials
      ADD CONSTRAINT fk_material_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assignment_lesson') THEN
    ALTER TABLE assignments
      ADD CONSTRAINT fk_assignment_lesson
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;
  END IF;
END
$$;

INSERT INTO course_modules (course_id, title, description, sort_order)
SELECT c.id, 'Основной модуль', 'Занятия, материалы и задания курса', 0
FROM courses c
WHERE NOT EXISTS (
  SELECT 1 FROM course_modules cm WHERE cm.course_id = c.id
);

UPDATE lessons l
SET module_id = (
  SELECT cm.id
  FROM course_modules cm
  WHERE cm.course_id = l.course_id
  ORDER BY cm.sort_order, cm.id
  LIMIT 1
)
WHERE l.module_id IS NULL;

CREATE INDEX IF NOT EXISTS lessons_module_order_idx
ON lessons (module_id, sort_order, lesson_date, id);

CREATE INDEX IF NOT EXISTS materials_lesson_order_idx
ON materials (lesson_id, sort_order, id);

CREATE INDEX IF NOT EXISTS assignments_lesson_order_idx
ON assignments (lesson_id, sort_order, id);
