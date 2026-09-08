const express = require("express");
const pool = require("../db");
const { requireAuth, requireTeacher } = require("../middleware/auth");
const router = express.Router();
const fs = require("fs");
const uploadMaterialFile = require("../middleware/materialUpload");
const path = require("path");
const config = require("../config");
const uploadAssignmentFile = require("../middleware/assignmentUpload");

// Создать учебный материал
router.post("/courses/:id/materials",requireAuth,requireTeacher,async (request, response) => {
  try {
    const courseId = request.params.id;
    const { title, description, materialType } = request.body;
    if (!/^\d+$/.test(courseId)) {
      return response.status(400).json({ error: "Некорректный идентификатор курса" });
    }
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    if (!normalizedTitle) {
      return response.status(400).json({ error: "Необходимо указать название материала" });
    }
    const allowedTypes = ["lecture", "presentation", "methodical", "other"];
    const normalizedType = typeof materialType === "string" ? materialType.trim() : "other";
    if (!allowedTypes.includes(normalizedType)) {
      return response.status(400).json({ error: "Недопустимый тип учебного материала" });
    }
    const courseResult = await pool.query(`
      SELECT id
      FROM courses
      WHERE id = $1
        AND teacher_id = $2
        AND is_active = TRUE
    `,[courseId, request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const result = await pool.query(`
      INSERT INTO materials (
        course_id,
        title,
        description,
        material_type
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        course_id,
        title,
        description,
        material_type,
        is_published,
        created_at,
        updated_at
    `,[
      courseId,
      normalizedTitle,
      typeof description === "string" ? description.trim() || null : null,
      normalizedType
    ]);
    response.status(201).json({
      message: "Учебный материал создан",
      material: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка создания учебного материала:", error);
    response.status(500).json({ error: "Ошибка создания учебного материала" });
  }
});

// Получить материалы учебного курса
router.get("/courses/:id/materials",requireAuth,requireTeacher,async (request, response) => {
  try {
    const courseId = request.params.id;
    if (!/^\d+$/.test(courseId)) {
      return response.status(400).json({ error: "Некорректный идентификатор курса" });
    }
    const courseResult = await pool.query(`
      SELECT id
      FROM courses
      WHERE id = $1
        AND teacher_id = $2
    `,[courseId, request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const result = await pool.query(`
      SELECT
        id,
        course_id,
        title,
        description,
        material_type,
        is_published,
        created_at,
        updated_at
      FROM materials
      WHERE course_id = $1
      ORDER BY created_at DESC, id DESC
    `,[courseId]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения материалов курса:", error);
    response.status(500).json({ error: "Ошибка получения материалов курса" });
  }
});

// Создать учебный курс
router.post("/courses",requireAuth,requireTeacher,async (request, response) => {
  try {
    const { disciplineId, groupId, academicYear, semester } = request.body;
    if (!disciplineId || !/^\d+$/.test(String(disciplineId))) {
      return response.status(400).json({ error: "Необходимо выбрать дисциплину" });
    }
    if (!groupId || !/^\d+$/.test(String(groupId))) {
      return response.status(400).json({ error: "Необходимо выбрать учебную группу" });
    }
    const normalizedAcademicYear = typeof academicYear === "string" ? academicYear.trim() : "";
    if (!/^\d{4}\/\d{4}$/.test(normalizedAcademicYear)) {
      return response.status(400).json({ error: "Учебный год должен быть указан в формате 2026/2027" });
    }
    const [startYear, endYear] = normalizedAcademicYear.split("/").map(Number);
    if (endYear !== startYear + 1) {
      return response.status(400).json({ error: "Некорректно указан учебный год" });
    }
    const semesterNumber = Number(semester);
    if (![1, 2].includes(semesterNumber)) {
      return response.status(400).json({ error: "Семестр должен быть 1 или 2" });
    }
    const disciplineResult = await pool.query(`
      SELECT id
      FROM disciplines
      WHERE id = $1
        AND is_active = TRUE
    `,[disciplineId]);
    if (disciplineResult.rowCount === 0) {
      return response.status(404).json({ error: "Дисциплина не найдена" });
    }
    const groupResult = await pool.query(`
      SELECT id
      FROM student_groups
      WHERE id = $1
        AND is_active = TRUE
    `,[groupId]);
    if (groupResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебная группа не найдена" });
    }
    const result = await pool.query(`
      INSERT INTO courses (
        discipline_id,
        group_id,
        teacher_id,
        academic_year,
        semester
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, discipline_id, group_id, teacher_id, academic_year, semester, is_active, created_at
    `,[
      disciplineId,
      groupId,
      request.user.id,
      normalizedAcademicYear,
      semesterNumber
    ]);
    response.status(201).json({
      message: "Учебный курс создан",
      course: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "course_unique") {
      return response.status(409).json({ error: "Такой учебный курс уже существует" });
    }
    console.error("Ошибка создания учебного курса:", error);
    response.status(500).json({ error: "Ошибка создания учебного курса" });
  }
});

// Получить учебные курсы преподавателя
router.get("/courses",requireAuth,requireTeacher,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.academic_year,
        c.semester,
        c.is_active,
        c.created_at,
        d.id AS discipline_id,
        d.name AS discipline_name,
        d.code AS discipline_code,
        g.id AS group_id,
        g.name AS group_name
      FROM courses c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_groups g ON g.id = c.group_id
      WHERE c.teacher_id = $1
      ORDER BY c.academic_year DESC, c.semester, d.name, g.name
    `,[request.user.id]);

    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения учебных курсов:", error);
    response.status(500).json({ error: "Ошибка получения списка учебных курсов" });
  }
});

// Создать дисциплину
router.post("/disciplines",requireAuth,requireTeacher,async (request, response) => {
    try {
      const { name, code, description } = request.body;
      const normalizedName = typeof name === "string" ? name.trim() : "";
      const normalizedCode = typeof code === "string" ? code.trim() : "";
      if (!normalizedName) {
        return response.status(400).json({ error: "Необходимо указать название дисциплины" });
      }
      const existingDiscipline = await pool.query(
          `
          SELECT id
          FROM disciplines
          WHERE LOWER(name) = LOWER($1) OR ($2 <> '' AND LOWER(code) = LOWER($2))
          `,
          [
            normalizedName,
            normalizedCode
          ]
        );
      if (existingDiscipline.rowCount > 0) {
        return response.status(409).json({ error: "Дисциплина с таким названием или кодом уже существует" });
      }
      const result = await pool.query(
        `
        INSERT INTO disciplines (name, code, description)
        VALUES ($1, $2, $3)
        RETURNING id, name, code, description, is_active, created_at
        `,
        [
          normalizedName,
          normalizedCode || null,
          typeof description === "string" ? description.trim() || null : null
        ]
      );
      response.status(201).json({ message: "Дисциплина создана", discipline: result.rows[0] });
    } catch (error) {
      console.error("Ошибка создания дисциплины:", error);
      response.status(500).json({ error: "Ошибка создания дисциплины" });
    }
  }
);

// Получить все дисциплины
router.get("/disciplines",requireAuth,requireTeacher,async (request, response) => {
    try {
      const result = await pool.query(`
        SELECT id, name, code, description, is_active, created_at
        FROM disciplines
        ORDER BY name
      `);
      response.json(result.rows);
    } catch (error) {
      console.error("Ошибка получения дисциплин:", error);
      response.status(500).json({ error: "Ошибка получения списка дисциплин" });
    }
  }
);

// Получить все группы
router.get("/groups",requireAuth,requireTeacher,async (request, response) => {
    try {
      const result = await pool.query(`
        SELECT g.id, g.name, g.description, g.is_active, g.created_at,
          COUNT(u.id) FILTER (
            WHERE u.status IN ('active', 'blocked')
            AND u.role = 'student'
          ) AS student_count
        FROM student_groups g
        LEFT JOIN student_profiles sp
          ON sp.group_id = g.id
        LEFT JOIN users u
          ON u.id = sp.user_id
        GROUP BY g.id, g.name, g.description, g.is_active, g.created_at
        ORDER BY g.name
      `);
      response.json(result.rows);
    } catch (error) {
      console.error("Ошибка получения групп:", error);
      response.status(500).json({ error: "Ошибка получения списка групп" });
    }
  }
);

// Создать группу
router.post("/groups",requireAuth,requireTeacher,async (request, response) => {
    try {
      const { name, description } = request.body;
      const normalizedName = typeof name === "string" ? name.trim() : "";
      if (!normalizedName) {
        return response.status(400).json({ error: "Необходимо указать название группы" });
      }
      const result = await pool.query(
        `
        INSERT INTO student_groups (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, is_active, created_at
        `,
        [
          normalizedName,
          typeof description === "string" ? description.trim() || null : null
        ]
      );
      response.status(201).json({
        message: "Группа создана",
        group: result.rows[0]
      });
    } catch (error) {
      if (
        error.code === "23505"
      ) {
        return response.status(409).json({ error: "Группа с таким названием уже существует" });
      }
      console.error("Ошибка создания группы:", error);
      response.status(500).json({ error: "Ошибка создания группы" });
    }
  }
);

// Получить студентов выбранной группы
router.get("/groups/:id/students",requireAuth,requireTeacher,async (request, response) => {
    try {
      const groupId = request.params.id;
      if (!/^\d+$/.test(groupId)) {
        return response.status(400).json({ error: "Некорректный идентификатор группы" });
      }
      const groupResult = await pool.query(
        `
        SELECT id, name, description, is_active
        FROM student_groups
        WHERE id = $1
        `,
        [groupId]
      );
      if (groupResult.rowCount === 0) {
        return response.status(404).json({ error: "Группа не найдена" });
      }
      const studentsResult = await pool.query(
        `
        SELECT u.id, u.email, u.last_name, u.first_name, u.middle_name, u.status, sp.student_number
        FROM users u
        JOIN student_profiles sp
          ON sp.user_id = u.id
        WHERE sp.group_id = $1
          AND u.role = 'student'
          AND u.status IN ('active', 'blocked')
        ORDER BY u.last_name, u.first_name, u.middle_name
        `,
        [groupId]
      );
      response.json({
        group: groupResult.rows[0],
        students: studentsResult.rows
      });
    } catch (error) {
      console.error("Ошибка получения студентов группы:", error);
      response.status(500).json({ error: "Ошибка получения студентов группы" });
    }
  }
);

// Получить профиль конкретного студента
router.get("/students/:id",requireAuth,requireTeacher,async (request, response) => {
    try {
      const studentId = request.params.id;
      if (!/^\d+$/.test(studentId)) {
        return response.status(400).json({ error: "Некорректный идентификатор студента" });
      }
      const result = await pool.query(
        `
        SELECT u.id, u.email, u.last_name, u.first_name, u.middle_name, u.phone, u.status,
          u.created_at, sp.student_number, g.id AS group_id, g.name AS group_name
        FROM users u
        JOIN student_profiles sp
          ON sp.user_id = u.id
        LEFT JOIN student_groups g
          ON g.id = sp.group_id
        WHERE u.id = $1
          AND u.role = 'student'
        `,
        [studentId]
      );
      if (result.rowCount === 0) {
        return response.status(404).json({ error: "Студент не найден" });
      }
      response.json({ student: result.rows[0] });
    } catch (error) {
      console.error("Ошибка получения студента:", error);
      response.status(500).json({ error: "Ошибка получения данных студента" });
    }
  }
);

// Изменить группу студента
router.patch("/students/:id/group",requireAuth,requireTeacher,async (request, response) => {
    try {
      const studentId = request.params.id;
      const { groupId } = request.body;
      if (!/^\d+$/.test(studentId)) {
        return response.status(400).json({ error: "Некорректный идентификатор студента" });
      }
      if (!groupId || !/^\d+$/.test(String(groupId))) {
        return response.status(400).json({ error: "Необходимо указать корректную группу" });
      }
      const groupResult = await pool.query(
        `
        SELECT id
        FROM student_groups
        WHERE id = $1
          AND is_active = TRUE
        `,
        [groupId]
      );
      if (groupResult.rowCount === 0) {
        return response.status(404).json({ error: "Учебная группа не найдена" });
      }
      const result = await pool.query(
        `
        UPDATE student_profiles sp
        SET group_id = $1
        FROM users u
        WHERE sp.user_id = $2
          AND u.id = sp.user_id
          AND u.role = 'student'
        RETURNING sp.user_id, sp.group_id, sp.student_number
        `,
        [
          groupId,
          studentId
        ]
      );
      if (result.rowCount === 0) {
        return response.status(404).json({ error: "Студент не найден" });
      }
      response.json({ message: "Группа студента изменена" });
    } catch (error) {
      console.error("Ошибка изменения группы студента:", error);
      response.status(500).json({ error: "Ошибка изменения группы студента" });
    }
  }
);

// Изменить статус студента
router.patch("/students/:id/status",requireAuth,requireTeacher,async (request, response) => {
    try {
      const studentId = request.params.id;
      const { status } = request.body;
      if (!/^\d+$/.test(studentId)) {
        return response.status(400).json({ error: "Некорректный идентификатор студента" });
      }
      const allowedStatuses = ["active", "blocked"];
      if (!allowedStatuses.includes(status)) {
        return response.status(400).json({ error: "Недопустимый статус студента" });
      }
      const result = await pool.query(
        `
        UPDATE users
        SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND role = 'student'
        RETURNING id, email, first_name, last_name, middle_name, status
        `,
        [
          status,
          studentId
        ]
      );
      if (result.rowCount === 0) {
        return response.status(404).json({ error: "Студент не найден" });
      }
      response.json({
        message:
          status === "blocked" ? "Студент заблокирован" : "Студент разблокирован",
        student: result.rows[0]
      });
    } catch (error) {
      console.error("Ошибка изменения статуса студента:", error);
      response.status(500).json({ error: "Ошибка изменения статуса студента" });
    }
  }
);

// Загрузить файл учебного материала
router.post("/materials/:materialId/files", requireAuth,requireTeacher,requireMaterialAccess,uploadMaterialFile,async (request, response) => {
    try {
      if (!request.file) {
        return response.status(400).json({ error: "Необходимо выбрать файл" });
      }
      const storageKey = `materials/${request.file.filename}`;
      const result = await pool.query(`
        INSERT INTO material_files (material_id, uploaded_by, original_name, stored_name, storage_key, mime_type, size_bytes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, material_id, original_name, mime_type, size_bytes, created_at
      `,[
        request.material.id,
        request.user.id,
        request.file.originalname,
        request.file.filename,
        storageKey,
        request.file.mimetype,
        request.file.size
      ]);
      response.status(201).json({
        message: "Файл загружен",
        file: result.rows[0]
      });
    } catch (error) {
      if (request.file?.path) {
        await fs.promises.unlink(request.file.path).catch(() => {});
      }
      console.error("Ошибка сохранения файла материала:", error);
      response.status(500).json({ error: "Ошибка сохранения файла" });
    }
  }
);

// Получить файлы учебного материала
router.get("/materials/:materialId/files",requireAuth,requireTeacher,requireMaterialAccess,async (request, response) => {
    try {
      const result = await pool.query(`
        SELECT id, material_id, original_name, mime_type, size_bytes, created_at
        FROM material_files
        WHERE material_id = $1
        ORDER BY created_at, id
      `,[request.material.id]);
      response.json(result.rows);
    } catch (error) {
      console.error("Ошибка получения файлов материала:", error);
      response.status(500).json({ error: "Ошибка получения файлов материала" });
    }
  }
);

// Скачать файл учебного материала
router.get("/files/:id/download",requireAuth,requireTeacher,async (request, response) => {
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      SELECT mf.id, mf.original_name, mf.storage_key, mf.mime_type, mf.size_bytes
      FROM material_files mf
      JOIN materials m ON m.id = mf.material_id
      JOIN courses c ON c.id = m.course_id
      WHERE mf.id = $1
        AND c.teacher_id = $2
    `,[fileId, request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    try {
      await fs.promises.access(filePath,fs.constants.R_OK);
    } catch {
      return response.status(404).json({ error: "Файл отсутствует в хранилище" });
    }
    response.download(filePath,file.original_name,(error) => {
      if (!error) return;
      console.error("Ошибка скачивания файла:", error);
      if (!response.headersSent) {
        response.status(500).json({ error: "Ошибка скачивания файла" });
      }
    });
  } catch (error) {
    console.error("Ошибка получения файла:", error);
    response.status(500).json({ error: "Ошибка получения файла" });
  }
});

// Удалить файл учебного материала
router.delete("/files/:id",requireAuth,requireTeacher,async (request, response) => {
  let client;
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    client = await pool.connect();
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT mf.id, mf.original_name, mf.storage_key
      FROM material_files mf
      JOIN materials m ON m.id = mf.material_id
      JOIN courses c ON c.id = m.course_id
      WHERE mf.id = $1
        AND c.teacher_id = $2
      FOR UPDATE OF mf
    `,[fileId, request.user.id]);
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      await client.query("ROLLBACK");
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    await client.query(`
      DELETE FROM material_files
      WHERE id = $1
    `,[fileId]);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await client.query("COMMIT");
    response.json({ message: "Файл удалён" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка удаления файла:", error);
    response.status(500).json({ error: "Ошибка удаления файла" });
  } finally {
    if (client) client.release();
  }
});

// Изменить публикацию учебного материала
router.patch("/materials/:materialId/publication",requireAuth,requireTeacher,requireMaterialAccess,async (request, response) => {
  try {
    const { isPublished } = request.body;
    if (typeof isPublished !== "boolean") {
      return response.status(400).json({ error: "Некорректное состояние публикации" });
    }
    const result = await pool.query(`
      UPDATE materials
      SET
        is_published = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, course_id, title, description, material_type, is_published, created_at, updated_at
    `,[isPublished, request.material.id]);
    response.json({
      message: isPublished ? "Материал опубликован" : "Материал снят с публикации",
      material: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка изменения публикации материала:", error);
    response.status(500).json({ error: "Ошибка изменения публикации материала" });
  }
});

// Получить задания учебного курса
router.get("/courses/:id/assignments",requireAuth,requireTeacher,async (request, response) => {
  try {
    const courseId = request.params.id;
    if (!/^\d+$/.test(courseId)) {
      return response.status(400).json({ error: "Некорректный идентификатор курса" });
    }
    const courseResult = await pool.query(`
      SELECT id
      FROM courses
      WHERE id = $1
        AND teacher_id = $2
    `,[courseId,request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const result = await pool.query(`
      SELECT
        id,
        course_id,
        title,
        description,
        deadline,
        max_score,
        is_published,
        published_at,
        created_at,
        updated_at
      FROM assignments
      WHERE course_id = $1
      ORDER BY created_at DESC, id DESC
    `,[courseId]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения заданий курса:", error);
    response.status(500).json({ error: "Ошибка получения заданий курса" });
  }
});

// Создать учебное задание
router.post("/courses/:id/assignments",requireAuth,requireTeacher,async (request, response) => {
  try {
    const courseId = request.params.id;
    const { title, description, deadline, maxScore } = request.body;
    if (!/^\d+$/.test(courseId)) {
      return response.status(400).json({ error: "Некорректный идентификатор курса" });
    }
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedDescription = typeof description === "string" ? description.trim() : "";
    if (!normalizedTitle) {
      return response.status(400).json({ error: "Необходимо указать название задания" });
    }
    const normalizedMaxScore = maxScore === undefined || maxScore === "" ? 5 : Number(maxScore);
    if (!Number.isFinite(normalizedMaxScore) || normalizedMaxScore <= 0) {
      return response.status(400).json({ error: "Максимальный балл должен быть больше нуля" });
    }
    let normalizedDeadline = null;
    if (deadline) {
      normalizedDeadline = new Date(deadline);

      if (Number.isNaN(normalizedDeadline.getTime())) {
        return response.status(400).json({ error: "Некорректный срок выполнения задания" });
      }
    }
    const courseResult = await pool.query(`
      SELECT id
      FROM courses
      WHERE id = $1
        AND teacher_id = $2
        AND is_active = TRUE
    `,[courseId,request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Активный учебный курс не найден" });
    }
    const result = await pool.query(`
      INSERT INTO assignments (
        course_id,
        title,
        description,
        deadline,
        max_score
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        course_id,
        title,
        description,
        deadline,
        max_score,
        is_published,
        published_at,
        created_at,
        updated_at
    `,[
      courseId,
      normalizedTitle,
      normalizedDescription || null,
      normalizedDeadline,
      normalizedMaxScore
    ]);
    response.status(201).json({
      message: "Задание создано",
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка создания задания:", error);
    response.status(500).json({ error: "Ошибка создания задания" });
  }
});

// Загрузить файл учебного задания
router.post("/assignments/:assignmentId/files",requireAuth,requireTeacher,requireAssignmentAccess,uploadAssignmentFile,async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ error: "Необходимо выбрать файл" });
    }
    const storageKey = `assignments/${request.file.filename}`;
    const result = await pool.query(`
      INSERT INTO assignment_files (
        assignment_id,
        uploaded_by,
        original_name,
        stored_name,
        storage_key,
        mime_type,
        size_bytes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        assignment_id,
        original_name,
        mime_type,
        size_bytes,
        created_at
    `,[
      request.assignment.id,
      request.user.id,
      request.file.originalname,
      request.file.filename,
      storageKey,
      request.file.mimetype,
      request.file.size
    ]);
    response.status(201).json({
      message: "Файл задания загружен",
      file: result.rows[0]
    });
  } catch (error) {
    if (request.file?.path) {
      await fs.promises.unlink(request.file.path).catch(() => {});
    }
    console.error("Ошибка сохранения файла задания:", error);
    response.status(500).json({ error: "Ошибка сохранения файла задания" });
  }
});

// Получить файлы учебного задания
router.get("/assignments/:assignmentId/files",requireAuth,requireTeacher,requireAssignmentAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        assignment_id,
        original_name,
        mime_type,
        size_bytes,
        created_at
      FROM assignment_files
      WHERE assignment_id = $1
      ORDER BY created_at, id
    `,[request.assignment.id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения файлов задания:", error);
    response.status(500).json({ error: "Ошибка получения файлов задания" });
  }
});

// Скачать файл учебного задания
router.get("/assignment-files/:id/download",requireAuth,requireTeacher,async (request, response) => {
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      SELECT
        af.id,
        af.original_name,
        af.storage_key
      FROM assignment_files af
      JOIN assignments a ON a.id = af.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE af.id = $1
        AND c.teacher_id = $2
    `,[fileId,request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    try {
      await fs.promises.access(filePath,fs.constants.R_OK);
    } catch {
      return response.status(404).json({ error: "Файл отсутствует в хранилище" });
    }
    response.download(filePath,file.original_name,(error) => {
      if (!error) return;
      console.error("Ошибка скачивания файла задания:", error);
      if (!response.headersSent) {
        response.status(500).json({ error: "Ошибка скачивания файла" });
      }
    });
  } catch (error) {
    console.error("Ошибка получения файла задания:", error);
    response.status(500).json({ error: "Ошибка получения файла" });
  }
});

// Удалить файл учебного задания
router.delete("/assignment-files/:id",requireAuth,requireTeacher,async (request, response) => {
  let client;
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    client = await pool.connect();
    await client.query("BEGIN");
    const result = await client.query(`
      SELECT
        af.id,
        af.original_name,
        af.storage_key
      FROM assignment_files af
      JOIN assignments a ON a.id = af.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE af.id = $1
        AND c.teacher_id = $2
      FOR UPDATE OF af
    `,[fileId,request.user.id]);
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      await client.query("ROLLBACK");
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    await client.query(`
      DELETE FROM assignment_files
      WHERE id = $1
    `,[fileId]);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await client.query("COMMIT");
    response.json({ message: "Файл задания удалён" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка удаления файла задания:", error);
    response.status(500).json({ error: "Ошибка удаления файла задания" });
  } finally {
    if (client) client.release();
  }
});

// Обновить состояние публикации учебного задания
router.patch("/assignments/:assignmentId/publication",requireAuth,requireTeacher,async (request, response) => {
  try {
    const assignmentId = request.params.assignmentId;
    const { isPublished } = request.body;
    if (!/^\d+$/.test(assignmentId)) {
      return response.status(400).json({ error: "Некорректный идентификатор задания" });
    }
    if (typeof isPublished !== "boolean") {
      return response.status(400).json({ error: "Некорректное состояние публикации" });
    }
    const assignmentResult = await pool.query(`
      SELECT a.id
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = $1
        AND c.teacher_id = $2
    `,[assignmentId,request.user.id]);
    if (assignmentResult.rowCount === 0) {
      return response.status(404).json({ error: "Задание не найдено" });
    }
    const result = await pool.query(`
      UPDATE assignments
      SET
        is_published = $1,
        published_at = CASE
          WHEN $1 = TRUE THEN CURRENT_TIMESTAMP
          ELSE NULL
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        course_id,
        title,
        description,
        deadline,
        max_score,
        is_published,
        published_at,
        created_at,
        updated_at
    `,[isPublished,assignmentId]);
    response.json({
      message: isPublished ? "Задание опубликовано" : "Задание снято с публикации",
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка изменения публикации задания:", error);
    response.status(500).json({ error: "Ошибка изменения публикации задания" });
  }
});

// Получить файлы материалов курса для задания
router.get("/assignments/:assignmentId/material-files",requireAuth,requireTeacher,requireAssignmentAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        mf.id,
        mf.original_name,
        mf.mime_type,
        mf.size_bytes,
        m.id AS material_id,
        m.title AS material_title,
        EXISTS (
          SELECT 1
          FROM assignment_material_files amf
          WHERE amf.assignment_id = $1
            AND amf.material_file_id = mf.id
        ) AS is_attached
      FROM material_files mf
      JOIN materials m ON m.id = mf.material_id
      WHERE m.course_id = $2
      ORDER BY m.title, mf.created_at, mf.id
    `,[request.assignment.id,request.assignment.course_id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения файлов материалов курса:", error);
    response.status(500).json({ error: "Ошибка получения файлов материалов курса" });
  }
});

// Прикрепить файл материала к заданию
router.post("/assignments/:assignmentId/material-files/:materialFileId",requireAuth,requireTeacher,requireAssignmentAccess,async (request, response) => {
  try {
    const materialFileId = request.params.materialFileId;
    if (!/^\d+$/.test(materialFileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const fileResult = await pool.query(`
      SELECT mf.id
      FROM material_files mf
      JOIN materials m ON m.id = mf.material_id
      WHERE mf.id = $1
        AND m.course_id = $2
    `,[materialFileId,request.assignment.course_id]);
    if (fileResult.rowCount === 0) {
      return response.status(404).json({ error: "Файл материала не найден в этом курсе" });
    }
    const result = await pool.query(`
      INSERT INTO assignment_material_files (
        assignment_id,
        material_file_id
      )
      VALUES ($1, $2)
      ON CONFLICT (assignment_id, material_file_id)
      DO NOTHING
      RETURNING assignment_id, material_file_id, created_at
    `,[request.assignment.id,materialFileId]);
    if (result.rowCount === 0) {
      return response.json({ message: "Файл уже прикреплён к заданию" });
    }
    response.status(201).json({
      message: "Файл материала прикреплён к заданию",
      file: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка прикрепления файла материала:", error);
    response.status(500).json({ error: "Ошибка прикрепления файла материала" });
  }
});

// Убрать файл материала из задания
router.delete("/assignments/:assignmentId/material-files/:materialFileId",requireAuth,requireTeacher,requireAssignmentAccess,async (request, response) => {
  try {
    const materialFileId = request.params.materialFileId;
    if (!/^\d+$/.test(materialFileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      DELETE FROM assignment_material_files
      WHERE assignment_id = $1
        AND material_file_id = $2
      RETURNING assignment_id, material_file_id
    `,[request.assignment.id,materialFileId]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Файл не прикреплён к заданию" });
    }
    response.json({ message: "Файл материала убран из задания" });
  } catch (error) {
    console.error("Ошибка удаления связи файла материала:", error);
    response.status(500).json({ error: "Ошибка удаления файла из задания" });
  }
});

// Получить работы студентов по заданию
router.get("/assignments/:assignmentId/submissions",requireAuth,requireTeacher,requireAssignmentAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT ss.id, ss.student_id, ss.status, ss.student_comment, ss.submitted_at, ss.score, ss.teacher_comment, ss.checked_at, a.max_score, u.first_name, u.last_name, u.middle_name, sp.student_number,
        CASE
          WHEN a.deadline IS NOT NULL
            AND ss.submitted_at IS NOT NULL
            AND ss.submitted_at > a.deadline
          THEN TRUE
          ELSE FALSE
        END AS is_late
      FROM student_submissions ss
      JOIN assignments a ON a.id = ss.assignment_id
      JOIN student_profiles sp ON sp.user_id = ss.student_id
      JOIN users u ON u.id = ss.student_id
      WHERE ss.assignment_id = $1
      ORDER BY
        CASE ss.status
          WHEN 'submitted' THEN 1
          WHEN 'returned' THEN 2
          WHEN 'graded' THEN 3
          WHEN 'draft' THEN 4
        END,
        ss.submitted_at,
        u.last_name,
        u.first_name
    `,[request.assignment.id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения работ студентов:", error);
    response.status(500).json({ error: "Ошибка получения работ студентов" });
  }
});

// Получить файлы работы студента
router.get("/submissions/:submissionId/files",requireAuth,requireTeacher,requireTeacherSubmissionAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT id, submission_id, original_name, mime_type, size_bytes, created_at
      FROM submission_files
      WHERE submission_id = $1
      ORDER BY created_at, id
    `,[request.submission.id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения файлов работы студента:", error);
    response.status(500).json({ error: "Ошибка получения файлов работы студента" });
  }
});

// Скачать файл работы студента
router.get("/submission-files/:id/download",requireAuth,requireTeacher,async (request, response) => {
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      SELECT
        sf.original_name,
        sf.storage_key
      FROM submission_files sf
      JOIN student_submissions ss ON ss.id = sf.submission_id
      JOIN assignments a ON a.id = ss.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE sf.id = $1
        AND c.teacher_id = $2
    `,[fileId,request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    try {
      await fs.promises.access(filePath,fs.constants.R_OK);
    } catch {
      return response.status(404).json({ error: "Файл отсутствует в хранилище" });
    }
    response.download(filePath,file.original_name,(error) => {
      if (!error) return;
      console.error("Ошибка скачивания файла работы студента:", error);
      if (!response.headersSent) {
        response.status(500).json({ error: "Ошибка скачивания файла" });
      }
    });
  } catch (error) {
    console.error("Ошибка получения файла работы студента:", error);
    response.status(500).json({ error: "Ошибка получения файла работы студента" });
  }
});

// Вернуть работу студенту на доработку
router.patch("/submissions/:submissionId/return",requireAuth,requireTeacher,requireTeacherSubmissionAccess,async (request, response) => {
  try {
    const { teacherComment } = request.body;
    const normalizedComment = typeof teacherComment === "string" ? teacherComment.trim() : "";
    if (request.submission.status !== "submitted") {
      return response.status(409).json({ error: "Вернуть можно только отправленную работу" });
    }
    if (!normalizedComment) {
      return response.status(400).json({ error: "Укажите комментарий для студента" });
    }
    const result = await pool.query(`
      UPDATE student_submissions
      SET
        status = 'returned',
        score = NULL,
        teacher_comment = $1,
        checked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        assignment_id,
        student_id,
        status,
        student_comment,
        submitted_at,
        score,
        teacher_comment,
        checked_at,
        updated_at
    `,[normalizedComment,request.submission.id]);
    response.json({
      message: "Работа возвращена студенту на доработку",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка возврата работы:", error);
    response.status(500).json({ error: "Ошибка возврата работы" });
  }
});

// Проверить и оценить работу
router.patch("/submissions/:submissionId/grade",requireAuth,requireTeacher,requireTeacherSubmissionAccess,async (request, response) => {
  try {
    const { score, teacherComment } = request.body;
    if (!["submitted","graded"].includes(request.submission.status)) {
      return response.status(409).json({ error: "Эта работа недоступна для оценивания" });
    }
    const normalizedScore = Number(score);
    const maxScore = Number(request.submission.max_score);
    const normalizedComment = typeof teacherComment === "string" ? teacherComment.trim() : "";
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0) {
      return response.status(400).json({ error: "Некорректный балл" });
    }
    if (normalizedScore > maxScore) {
      return response.status(400).json({
        error: `Балл не может превышать максимальный балл задания: ${maxScore}`
      });
    }
    const result = await pool.query(`
      UPDATE student_submissions
      SET
        status = 'graded',
        score = $1,
        teacher_comment = $2,
        checked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        assignment_id,
        student_id,
        status,
        student_comment,
        submitted_at,
        score,
        teacher_comment,
        checked_at,
        updated_at
    `,[
      normalizedScore,
      normalizedComment || null,
      request.submission.id
    ]);
    response.json({
      message: "Работа оценена",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка оценивания работы:", error);
    response.status(500).json({ error: "Ошибка оценивания работы" });
  }
});

// Получить электронный журнал учебного курса
router.get("/courses/:id/journal",requireAuth,requireTeacher,async (request, response) => {
  try {
    const courseId = request.params.id;
    if (!/^\d+$/.test(courseId)) {
      return response.status(400).json({ error: "Некорректный идентификатор курса" });
    }
    const courseResult = await pool.query(`
      SELECT
        c.id,
        c.academic_year,
        c.semester,
        d.name AS discipline_name,
        d.code AS discipline_code,
        g.id AS group_id,
        g.name AS group_name
      FROM courses c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_groups g ON g.id = c.group_id
      WHERE c.id = $1
        AND c.teacher_id = $2
    `,[courseId,request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const course = courseResult.rows[0];
    const assignmentsResult = await pool.query(`
      SELECT
        id,
        title,
        deadline,
        max_score,
        is_published
      FROM assignments
      WHERE course_id = $1
      ORDER BY created_at, id
    `,[courseId]);
    const studentsResult = await pool.query(`
      SELECT
        u.id,
        u.last_name,
        u.first_name,
        u.middle_name,
        u.status,
        sp.student_number
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.group_id = $1
        AND u.role = 'student'
        AND u.status IN ('active','blocked')
      ORDER BY u.last_name, u.first_name, u.middle_name
    `,[course.group_id]);
    const submissionsResult = await pool.query(`
      SELECT
        ss.id,
        ss.assignment_id,
        ss.student_id,
        ss.status,
        ss.score,
        ss.submitted_at,
        ss.checked_at,
        CASE
          WHEN a.deadline IS NOT NULL
            AND ss.submitted_at IS NOT NULL
            AND ss.submitted_at > a.deadline
          THEN TRUE
          ELSE FALSE
        END AS is_late
      FROM student_submissions ss
      JOIN assignments a ON a.id = ss.assignment_id
      WHERE a.course_id = $1
    `,[courseId]);
    const submissionsByStudent = {};
    for (const submission of submissionsResult.rows) {
      if (!submissionsByStudent[submission.student_id]) {
        submissionsByStudent[submission.student_id] = {};
      }
      submissionsByStudent[submission.student_id][submission.assignment_id] = {
        id: submission.id,
        status: submission.status,
        score: submission.score,
        submitted_at: submission.submitted_at,
        checked_at: submission.checked_at,
        is_late: submission.is_late
      };
    }
    const students = studentsResult.rows.map(student => ({
      ...student,
      submissions: submissionsByStudent[student.id] || {}
    }));
    response.json({
      course,
      assignments: assignmentsResult.rows,
      students
    });
  } catch (error) {
    console.error("Ошибка получения электронного журнала:", error);
    response.status(500).json({ error: "Ошибка получения электронного журнала" });
  }
});

async function requireMaterialAccess(request, response, next) {
  try {
    const materialId = request.params.materialId;
    if (!/^\d+$/.test(materialId)) {
      return response.status(400).json({ error: "Некорректный идентификатор материала" });
    }
    const result = await pool.query(`
      SELECT m.id, m.course_id
      FROM materials m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = $1
        AND c.teacher_id = $2
    `,[materialId, request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Учебный материал не найден" });
    }
    request.material = result.rows[0];
    next();
  } catch (error) {
    console.error("Ошибка проверки доступа к материалу:", error);
    response.status(500).json({ error: "Ошибка проверки доступа к материалу" });
  }
}

async function requireAssignmentAccess(request, response, next) {
  try {
    const assignmentId = request.params.assignmentId;
    if (!/^\d+$/.test(assignmentId)) {
      return response.status(400).json({ error: "Некорректный идентификатор задания" });
    }
    const result = await pool.query(`
      SELECT
        a.id,
        a.course_id,
        a.title
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE a.id = $1
        AND c.teacher_id = $2
    `,[assignmentId,request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Задание не найдено" });
    }
    request.assignment = result.rows[0];
    next();
  } catch (error) {
    console.error("Ошибка проверки доступа к заданию:", error);
    response.status(500).json({ error: "Ошибка проверки доступа к заданию" });
  }
}

async function requireTeacherSubmissionAccess(request, response, next) {
  try {
    const submissionId = request.params.submissionId;
    if (!/^\d+$/.test(submissionId)) {
      return response.status(400).json({ error: "Некорректный идентификатор работы" });
    }
    const result = await pool.query(`
      SELECT ss.id, ss.assignment_id, ss.student_id, ss.status, ss.student_comment, ss.submitted_at, ss.score, ss.teacher_comment, ss.checked_at, a.title
        AS assignment_title, a.max_score, a.deadline
      FROM student_submissions ss
      JOIN assignments a ON a.id = ss.assignment_id
      JOIN courses c ON c.id = a.course_id
      WHERE ss.id = $1
        AND c.teacher_id = $2
    `,[submissionId,request.user.id]);
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Работа студента не найдена" });
    }
    request.submission = result.rows[0];
    next();
  } catch (error) {
    console.error("Ошибка проверки доступа к работе студента:", error);
    response.status(500).json({ error: "Ошибка проверки доступа к работе студента" });
  }
}

module.exports = router;
