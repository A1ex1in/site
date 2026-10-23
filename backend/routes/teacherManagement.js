const express = require("express");
const pool = require("../db");
const { requireAuth, requireTeacher } = require("../middleware/auth");
const {
  normalizeText,
  parseId,
  parseBoolean,
  parseAcademicYear,
  parseSemester,
  parsePositiveNumber,
  parseOptionalDateTime,
  parseIsoDate
} = require("../lib/validation");

const router = express.Router();
router.use(requireAuth, requireTeacher);

router.patch("/groups/:id", async (request, response) => {
  const groupId = parseId(request.params.id);
  const name = normalizeText(request.body?.name, { maxLength: 100, required: true });
  const description = normalizeText(request.body?.description, { maxLength: 1000 });
  const isActive = request.body?.isActive == null ? null : parseBoolean(request.body.isActive);

  if (!groupId) return response.status(400).json({ error: "Некорректный идентификатор группы" });
  if (!name || description === null || (request.body?.isActive != null && isActive === null)) {
    return response.status(400).json({ error: "Проверьте данные учебной группы" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE student_groups
      SET name = $1, description = $2, is_active = COALESCE($3, is_active)
      WHERE id = $4
      RETURNING id, name, description, is_active, created_at
      `,
      [name, description || null, isActive, groupId]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Учебная группа не найдена" });
    response.json({ message: "Учебная группа обновлена", group: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return response.status(409).json({ error: "Группа с таким названием уже существует" });
    console.error("Ошибка изменения группы:", error);
    response.status(500).json({ error: "Ошибка изменения учебной группы" });
  }
});

router.delete("/groups/:id", async (request, response) => {
  const groupId = parseId(request.params.id);
  if (!groupId) return response.status(400).json({ error: "Некорректный идентификатор группы" });

  try {
    const result = await pool.query(
      `
      UPDATE student_groups
      SET is_active = FALSE
      WHERE id = $1 AND is_active = TRUE
      RETURNING id, name, description, is_active, created_at
      `,
      [groupId]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Активная учебная группа не найдена" });
    response.json({ message: "Учебная группа перенесена в архив", group: result.rows[0] });
  } catch (error) {
    console.error("Ошибка архивирования группы:", error);
    response.status(500).json({ error: "Ошибка архивирования учебной группы" });
  }
});

router.patch("/disciplines/:id", async (request, response) => {
  const disciplineId = parseId(request.params.id);
  const name = normalizeText(request.body?.name, { maxLength: 255, required: true });
  const code = normalizeText(request.body?.code, { maxLength: 50 });
  const description = normalizeText(request.body?.description, { maxLength: 5000 });
  const isActive = request.body?.isActive == null ? null : parseBoolean(request.body.isActive);

  if (!disciplineId) return response.status(400).json({ error: "Некорректный идентификатор дисциплины" });
  if (!name || code === null || description === null || (request.body?.isActive != null && isActive === null)) {
    return response.status(400).json({ error: "Проверьте данные дисциплины" });
  }

  try {
    const duplicate = await pool.query(
      `
      SELECT id FROM disciplines
      WHERE id <> $1 AND (LOWER(name) = LOWER($2) OR ($3 <> '' AND LOWER(code) = LOWER($3)))
      `,
      [disciplineId, name, code || ""]
    );
    if (duplicate.rowCount > 0) {
      return response.status(409).json({ error: "Дисциплина с таким названием или кодом уже существует" });
    }

    const result = await pool.query(
      `
      UPDATE disciplines
      SET name = $1, code = $2, description = $3, is_active = COALESCE($4, is_active)
      WHERE id = $5
      RETURNING id, name, code, description, is_active, created_at
      `,
      [name, code || null, description || null, isActive, disciplineId]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Дисциплина не найдена" });
    response.json({ message: "Дисциплина обновлена", discipline: result.rows[0] });
  } catch (error) {
    console.error("Ошибка изменения дисциплины:", error);
    response.status(500).json({ error: "Ошибка изменения дисциплины" });
  }
});

router.delete("/disciplines/:id", async (request, response) => {
  const disciplineId = parseId(request.params.id);
  if (!disciplineId) return response.status(400).json({ error: "Некорректный идентификатор дисциплины" });

  try {
    const result = await pool.query(
      `
      UPDATE disciplines
      SET is_active = FALSE
      WHERE id = $1 AND is_active = TRUE
      RETURNING id, name, code, description, is_active, created_at
      `,
      [disciplineId]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Активная дисциплина не найдена" });
    response.json({ message: "Дисциплина перенесена в архив", discipline: result.rows[0] });
  } catch (error) {
    console.error("Ошибка архивирования дисциплины:", error);
    response.status(500).json({ error: "Ошибка архивирования дисциплины" });
  }
});

router.patch("/courses/:id", async (request, response) => {
  const courseId = parseId(request.params.id);
  const disciplineId = parseId(request.body?.disciplineId);
  const groupId = parseId(request.body?.groupId);
  const academicYear = parseAcademicYear(request.body?.academicYear);
  const semester = parseSemester(request.body?.semester);
  const isActive = request.body?.isActive == null ? null : parseBoolean(request.body.isActive);

  if (!courseId) return response.status(400).json({ error: "Некорректный идентификатор курса" });
  if (!disciplineId || !groupId || !academicYear || !semester || (request.body?.isActive != null && isActive === null)) {
    return response.status(400).json({ error: "Проверьте данные учебного курса" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const currentResult = await client.query(
      `
      SELECT id, discipline_id, group_id
      FROM courses
      WHERE id = $1 AND teacher_id = $2
      FOR UPDATE
      `,
      [courseId, request.user.id]
    );
    if (currentResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Учебный курс не найден" });
    }

    const current = currentResult.rows[0];
    if (Number(current.discipline_id) !== disciplineId || Number(current.group_id) !== groupId) {
      const content = await client.query(
        `
        SELECT
          EXISTS (SELECT 1 FROM materials WHERE course_id = $1) AS has_materials,
          EXISTS (SELECT 1 FROM assignments WHERE course_id = $1) AS has_assignments,
          EXISTS (SELECT 1 FROM lessons WHERE course_id = $1) AS has_lessons
        `,
        [courseId]
      );
      if (content.rows[0].has_materials || content.rows[0].has_assignments || content.rows[0].has_lessons) {
        await client.query("ROLLBACK");
        return response.status(409).json({
          error: "Нельзя сменить группу или дисциплину курса, в котором уже есть учебные данные"
        });
      }
    }

    const references = await client.query(
      `
      SELECT
        EXISTS (SELECT 1 FROM disciplines WHERE id = $1 AND is_active = TRUE) AS discipline_exists,
        EXISTS (SELECT 1 FROM student_groups WHERE id = $2 AND is_active = TRUE) AS group_exists
      `,
      [disciplineId, groupId]
    );
    if (!references.rows[0].discipline_exists || !references.rows[0].group_exists) {
      await client.query("ROLLBACK");
      return response.status(400).json({ error: "Выберите активную дисциплину и учебную группу" });
    }

    const result = await client.query(
      `
      UPDATE courses
      SET discipline_id = $1, group_id = $2, academic_year = $3, semester = $4,
          is_active = COALESCE($5, is_active)
      WHERE id = $6 AND teacher_id = $7
      RETURNING id, discipline_id, group_id, teacher_id, academic_year, semester, is_active, created_at
      `,
      [disciplineId, groupId, academicYear, semester, isActive, courseId, request.user.id]
    );
    await client.query("COMMIT");
    response.json({ message: "Учебный курс обновлён", course: result.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") return response.status(409).json({ error: "Такой учебный курс уже существует" });
    console.error("Ошибка изменения курса:", error);
    response.status(500).json({ error: "Ошибка изменения учебного курса" });
  } finally {
    if (client) client.release();
  }
});

router.delete("/courses/:id", async (request, response) => {
  const courseId = parseId(request.params.id);
  if (!courseId) return response.status(400).json({ error: "Некорректный идентификатор курса" });

  try {
    const result = await pool.query(
      `
      UPDATE courses
      SET is_active = FALSE
      WHERE id = $1 AND teacher_id = $2 AND is_active = TRUE
      RETURNING id, discipline_id, group_id, teacher_id, academic_year, semester, is_active, created_at
      `,
      [courseId, request.user.id]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Активный учебный курс не найден" });
    response.json({ message: "Учебный курс перенесён в архив", course: result.rows[0] });
  } catch (error) {
    console.error("Ошибка архивирования курса:", error);
    response.status(500).json({ error: "Ошибка архивирования учебного курса" });
  }
});

router.patch("/materials/:materialId", async (request, response) => {
  const materialId = parseId(request.params.materialId);
  const title = normalizeText(request.body?.title, { maxLength: 255, required: true });
  const description = normalizeText(request.body?.description, { maxLength: 10_000 });
  const materialType = normalizeText(request.body?.materialType, { maxLength: 50, required: true });
  const allowedTypes = new Set(["lecture", "presentation", "methodical", "other"]);

  if (!materialId) return response.status(400).json({ error: "Некорректный идентификатор материала" });
  if (!title || description === null || !materialType || !allowedTypes.has(materialType)) {
    return response.status(400).json({ error: "Проверьте данные учебного материала" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE materials m
      SET title = $1, description = $2, material_type = $3, updated_at = CURRENT_TIMESTAMP
      FROM courses c
      WHERE m.id = $4 AND c.id = m.course_id AND c.teacher_id = $5
      RETURNING m.id, m.course_id, m.title, m.description, m.material_type,
                m.is_published, m.created_at, m.updated_at
      `,
      [title, description || null, materialType, materialId, request.user.id]
    );
    if (result.rowCount === 0) return response.status(404).json({ error: "Учебный материал не найден" });
    response.json({ message: "Учебный материал обновлён", material: result.rows[0] });
  } catch (error) {
    console.error("Ошибка изменения материала:", error);
    response.status(500).json({ error: "Ошибка изменения учебного материала" });
  }
});

router.delete("/materials/:materialId", async (request, response) => {
  const materialId = parseId(request.params.materialId);
  if (!materialId) return response.status(400).json({ error: "Некорректный идентификатор материала" });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const material = await client.query(
      `
      SELECT m.id
      FROM materials m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = $1 AND c.teacher_id = $2
      FOR UPDATE OF m
      `,
      [materialId, request.user.id]
    );
    if (material.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Учебный материал не найден" });
    }

    const files = await client.query(`SELECT 1 FROM material_files WHERE material_id = $1 LIMIT 1`, [materialId]);
    if (files.rowCount > 0) {
      await client.query("ROLLBACK");
      return response.status(409).json({ error: "Перед удалением материала удалите прикреплённые файлы" });
    }

    await client.query(`DELETE FROM materials WHERE id = $1`, [materialId]);
    await client.query("COMMIT");
    response.json({ message: "Учебный материал удалён" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка удаления материала:", error);
    response.status(500).json({ error: "Ошибка удаления учебного материала" });
  } finally {
    if (client) client.release();
  }
});

router.patch("/assignments/:assignmentId", async (request, response) => {
  const assignmentId = parseId(request.params.assignmentId);
  const title = normalizeText(request.body?.title, { maxLength: 255, required: true });
  const description = normalizeText(request.body?.description, { maxLength: 10_000 });
  const deadline = parseOptionalDateTime(request.body?.deadline);
  const gradeDate = parseIsoDate(request.body?.gradeDate);
  const maxScore = parsePositiveNumber(request.body?.maxScore, { max: 9999.99 });

  if (!assignmentId) return response.status(400).json({ error: "Некорректный идентификатор задания" });
  if (!title || description === null || deadline === undefined || !gradeDate || !maxScore) {
    return response.status(400).json({ error: "Проверьте данные учебного задания" });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const assignment = await client.query(
      `
      SELECT a.id, a.course_id
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = $1 AND c.teacher_id = $2
      FOR UPDATE OF a
      `,
      [assignmentId, request.user.id]
    );
    if (assignment.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Задание не найдено" });
    }

    const excessiveGrade = await client.query(
      `
      SELECT 1
      FROM grades g
      JOIN grade_items gi ON gi.id = g.grade_item_id
      WHERE gi.assignment_id = $1 AND g.score > $2
      LIMIT 1
      `,
      [assignmentId, maxScore]
    );
    if (excessiveGrade.rowCount > 0) {
      await client.query("ROLLBACK");
      return response.status(409).json({
        error: "Новый максимальный балл меньше уже выставленной оценки"
      });
    }

    const result = await client.query(
      `
      UPDATE assignments
      SET title = $1, description = $2, deadline = $3, max_score = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, course_id, title, description, deadline, max_score,
                is_published, published_at, created_at, updated_at
      `,
      [title, description || null, deadline, maxScore, assignmentId]
    );
    await client.query(
      `
      UPDATE grade_items
      SET title = $1, max_score = $2, grade_date = $3, updated_at = CURRENT_TIMESTAMP
      WHERE assignment_id = $4
      `,
      [title, maxScore, gradeDate, assignmentId]
    );

    await client.query("COMMIT");
    response.json({ message: "Учебное задание обновлено", assignment: result.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка изменения задания:", error);
    response.status(500).json({ error: "Ошибка изменения учебного задания" });
  } finally {
    if (client) client.release();
  }
});

router.delete("/assignments/:assignmentId", async (request, response) => {
  const assignmentId = parseId(request.params.assignmentId);
  if (!assignmentId) return response.status(400).json({ error: "Некорректный идентификатор задания" });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const assignment = await client.query(
      `
      SELECT a.id
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = $1 AND c.teacher_id = $2
      FOR UPDATE OF a
      `,
      [assignmentId, request.user.id]
    );
    if (assignment.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Задание не найдено" });
    }

    const dependencies = await client.query(
      `
      SELECT
        EXISTS (SELECT 1 FROM assignment_files WHERE assignment_id = $1) AS has_files,
        EXISTS (SELECT 1 FROM student_submissions WHERE assignment_id = $1) AS has_submissions,
        EXISTS (
          SELECT 1 FROM grades g
          JOIN grade_items gi ON gi.id = g.grade_item_id
          WHERE gi.assignment_id = $1
        ) AS has_grades
      `,
      [assignmentId]
    );
    const state = dependencies.rows[0];
    if (state.has_files || state.has_submissions || state.has_grades) {
      await client.query("ROLLBACK");
      return response.status(409).json({
        error: "Нельзя удалить задание с файлами, работами студентов или оценками"
      });
    }

    await client.query(`DELETE FROM grade_items WHERE assignment_id = $1`, [assignmentId]);
    await client.query(`DELETE FROM assignments WHERE id = $1`, [assignmentId]);
    await client.query("COMMIT");
    response.json({ message: "Учебное задание удалено" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка удаления задания:", error);
    response.status(500).json({ error: "Ошибка удаления учебного задания" });
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
