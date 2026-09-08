const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const config = require("../config");
const { requireAuth, requireStudent } = require("../middleware/auth");
const uploadSubmissionFile = require("../middleware/submissionUpload");

const router = express.Router();

router.get("/profile",requireAuth,requireStudent,async (request, response) => {
    try {
      const result = await pool.query(
        `
        SELECT u.id, u.email, u.first_name, u.last_name, u.middle_name, sp.student_number, g.id AS group_id, g.name AS group_name
        FROM users u
        JOIN student_profiles sp
          ON sp.user_id = u.id
        LEFT JOIN student_groups g
          ON g.id = sp.group_id
        WHERE u.id = $1
          AND u.role = 'student'
        `,
        [request.user.id]
      );
      if (result.rowCount === 0) {
        return response.status(404).json({ error: "Профиль студента не найден" });
      }
      const student = result.rows[0];
      response.json({
        student: {
          id: student.id,
          email: student.email,
          firstName: student.first_name,
          lastName: student.last_name,
          middleName: student.middle_name,
          studentNumber:
            student.student_number,
          group: student.group_id ? { id: student.group_id, name: student.group_name } : null
        }
      });
    } catch (error) {
      console.error("Ошибка получения профиля студента:", error);
      response.status(500).json({ error: "Ошибка получения профиля студента" });
    }
  }
);

// Получить учебные курсы студента
router.get("/courses",requireAuth,requireStudent,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.academic_year,
        c.semester,
        d.id AS discipline_id,
        d.name AS discipline_name,
        d.code AS discipline_code,
        u.id AS teacher_id,
        u.first_name AS teacher_first_name,
        u.last_name AS teacher_last_name,
        u.middle_name AS teacher_middle_name
      FROM student_profiles sp
      JOIN courses c ON c.group_id = sp.group_id
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN users u ON u.id = c.teacher_id
      WHERE sp.user_id = $1
        AND c.is_active = TRUE
        AND d.is_active = TRUE
      ORDER BY c.academic_year DESC, c.semester, d.name
    `,[request.user.id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения учебных курсов студента:", error);
    response.status(500).json({ error: "Ошибка получения учебных курсов" });
  }
});

// Получить опубликованные материалы учебного курса
router.get("/courses/:id/materials",requireAuth,requireStudent,async (request, response) => {
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
        d.code AS discipline_code
      FROM courses c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_profiles sp ON sp.group_id = c.group_id
      WHERE c.id = $1
        AND sp.user_id = $2
        AND c.is_active = TRUE
    `,[courseId,request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const materialsResult = await pool.query(`
      SELECT
        id,
        course_id,
        title,
        description,
        material_type,
        created_at,
        updated_at
      FROM materials
      WHERE course_id = $1
        AND is_published = TRUE
      ORDER BY created_at, id
    `,[courseId]);
    response.json({
      course: courseResult.rows[0],
      materials: materialsResult.rows
    });
  } catch (error) {
    console.error("Ошибка получения материалов курса:", error);
    response.status(500).json({ error: "Ошибка получения материалов курса" });
  }
});

// Получить файлы опубликованного материала
router.get("/materials/:materialId/files",requireAuth,requireStudent,async (request, response) => {
  try {
    const materialId = request.params.materialId;
    if (!/^\d+$/.test(materialId)) {
      return response.status(400).json({ error: "Некорректный идентификатор материала" });
    }
    const materialResult = await pool.query(`
      SELECT
        m.id,
        m.title
      FROM materials m
      JOIN courses c ON c.id = m.course_id
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_profiles sp ON sp.group_id = c.group_id
      WHERE m.id = $1
        AND sp.user_id = $2
        AND m.is_published = TRUE
        AND c.is_active = TRUE
        AND d.is_active = TRUE
    `,[materialId,request.user.id]);
    if (materialResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный материал не найден" });
    }
    const filesResult = await pool.query(`
      SELECT
        id,
        material_id,
        original_name,
        mime_type,
        size_bytes,
        created_at
      FROM material_files
      WHERE material_id = $1
      ORDER BY created_at, id
    `,[materialId]);
    response.json(filesResult.rows);
  } catch (error) {
    console.error("Ошибка получения файлов материала:", error);
    response.status(500).json({ error: "Ошибка получения файлов материала" });
  }
});

// Скачать файл опубликованного материала
router.get("/files/:id/download",requireAuth,requireStudent,async (request, response) => {
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      SELECT
        mf.id,
        mf.original_name,
        mf.storage_key
      FROM material_files mf
      JOIN materials m ON m.id = mf.material_id
      JOIN courses c ON c.id = m.course_id
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_profiles sp ON sp.group_id = c.group_id
      WHERE mf.id = $1
        AND sp.user_id = $2
        AND m.is_published = TRUE
        AND c.is_active = TRUE
        AND d.is_active = TRUE
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

// Получить опубликованные задания учебного курса
router.get("/courses/:id/assignments",requireAuth,requireStudent,async (request, response) => {
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
        d.code AS discipline_code
      FROM courses c
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_profiles sp ON sp.group_id = c.group_id
      WHERE c.id = $1
        AND sp.user_id = $2
        AND c.is_active = TRUE
        AND d.is_active = TRUE
    `,[courseId,request.user.id]);
    if (courseResult.rowCount === 0) {
      return response.status(404).json({ error: "Учебный курс не найден" });
    }
    const assignmentsResult = await pool.query(`
      SELECT
        id,
        course_id,
        title,
        description,
        deadline,
        max_score,
        published_at
      FROM assignments
      WHERE course_id = $1
        AND is_published = TRUE
      ORDER BY deadline NULLS LAST, created_at, id
    `,[courseId]);
    response.json({
      course: courseResult.rows[0],
      assignments: assignmentsResult.rows
    });
  } catch (error) {
    console.error("Ошибка получения заданий курса:", error);
    response.status(500).json({ error: "Ошибка получения заданий курса" });
  }
});

// Получаем все файлы задания
router.get("/assignments/:assignmentId/files",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT af.id, af.original_name, af.mime_type, af.size_bytes, af.created_at, 'assignment' AS source, NULL::VARCHAR AS material_title
      FROM assignment_files af
      WHERE af.assignment_id = $1
      UNION ALL
      SELECT mf.id, mf.original_name, mf.mime_type, mf.size_bytes, amf.created_at, 'material' AS source, m.title AS material_title
      FROM assignment_material_files amf
      JOIN material_files mf ON mf.id = amf.material_file_id
      JOIN materials m ON m.id = mf.material_id
      WHERE amf.assignment_id = $1
        AND m.course_id = $2
      ORDER BY created_at, id
    `,[request.assignment.id,request.assignment.course_id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения файлов задания:", error);
    response.status(500).json({ error: "Ошибка получения файлов задания" });
  }
});

// Защищённое скачивание
router.get("/assignments/:assignmentId/files/:source/:fileId/download",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const { source, fileId } = request.params;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    let result;
    if (source === "assignment") {
      result = await pool.query(`
        SELECT
          original_name,
          storage_key
        FROM assignment_files
        WHERE id = $1
          AND assignment_id = $2
      `,[fileId,request.assignment.id]);
    } else if (source === "material") {
      result = await pool.query(`
        SELECT
          mf.original_name,
          mf.storage_key
        FROM assignment_material_files amf
        JOIN material_files mf ON mf.id = amf.material_file_id
        JOIN materials m ON m.id = mf.material_id
        WHERE amf.assignment_id = $1
          AND mf.id = $2
          AND m.course_id = $3
      `,[request.assignment.id,fileId,request.assignment.course_id]);
    } else {
      return response.status(400).json({ error: "Некорректный источник файла" });
    }
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

// Получить работу студента по заданию
router.get("/assignments/:assignmentId/submission",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT id, assignment_id, student_id, status, student_comment, submitted_at, score, teacher_comment, checked_at, created_at, updated_at
      FROM student_submissions
      WHERE assignment_id = $1
        AND student_id = $2
    `,[request.assignment.id,request.user.id]);
    response.json({
      submission: result.rows[0] || null
    });
  } catch (error) {
    console.error("Ошибка получения работы студента:", error);
    response.status(500).json({ error: "Ошибка получения работы студента" });
  }
});

// Создать или сохранить черновик работы
router.put("/assignments/:assignmentId/submission",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const { studentComment } = request.body;
    const normalizedComment = typeof studentComment === "string" ? studentComment.trim() : "";
    const existingResult = await pool.query(`
      SELECT id, status
      FROM student_submissions
      WHERE assignment_id = $1
        AND student_id = $2
    `,[request.assignment.id,request.user.id]);
    let result;
    if (existingResult.rowCount === 0) {
      result = await pool.query(`
        INSERT INTO student_submissions (
          assignment_id,
          student_id,
          student_comment
        )
        VALUES ($1, $2, $3)
        RETURNING id, assignment_id, student_id, status, student_comment, submitted_at, score, teacher_comment, checked_at, created_at, updated_at
      `,[
        request.assignment.id,
        request.user.id,
        normalizedComment || null
      ]);
      return response.status(201).json({
        message: "Черновик работы создан",
        submission: result.rows[0]
      });
    }
    const existingSubmission = existingResult.rows[0];
    if (!["draft","returned"].includes(existingSubmission.status)) {
      return response.status(409).json({
        error: existingSubmission.status === "submitted"
          ? "Работа уже отправлена преподавателю"
          : "Проверенная работа недоступна для изменения"
      });
    }
    result = await pool.query(`
      UPDATE student_submissions
      SET
        student_comment = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, assignment_id, student_id, status, student_comment, submitted_at, score, teacher_comment, checked_at, created_at, updated_at
    `,[normalizedComment || null,existingSubmission.id]);
    response.json({
      message: "Работа сохранена",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка сохранения работы студента:", error);
    response.status(500).json({ error: "Ошибка сохранения работы студента" });
  }
});

// Отправить работу преподавателю
router.post("/assignments/:assignmentId/submission/submit",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const submissionResult = await pool.query(`
      SELECT id, status
      FROM student_submissions
      WHERE assignment_id = $1
        AND student_id = $2
    `,[request.assignment.id,request.user.id]);
    if (submissionResult.rowCount === 0) {
      return response.status(404).json({ error: "Сначала создайте работу" });
    }
    const submission = submissionResult.rows[0];
    if (!["draft","returned"].includes(submission.status)) {
      return response.status(409).json({
        error: submission.status === "submitted" ? "Работа уже отправлена преподавателю" : "Работа уже проверена"
      });
    }
    const result = await pool.query(`
      UPDATE student_submissions
      SET
        status = 'submitted',
        submitted_at = CURRENT_TIMESTAMP,
        score = NULL,
        checked_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, assignment_id, student_id, status, student_comment, submitted_at, score,
        teacher_comment, checked_at, created_at, updated_at
    `,[submission.id]);
    response.json({
      message: "Работа отправлена преподавателю",
      submission: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка отправки работы:", error);
    response.status(500).json({ error: "Ошибка отправки работы" });
  }
});

// Загрузить файл работы студента
router.post("/assignments/:assignmentId/submission/files",requireAuth,requireStudent,requireStudentAssignmentAccess,requireEditableSubmission,uploadSubmissionFile,async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ error: "Необходимо выбрать файл" });
    }
    const storageKey = `submissions/${request.file.filename}`;
    const result = await pool.query(`
      INSERT INTO submission_files (submission_id, uploaded_by, original_name, stored_name, storage_key, mime_type, size_bytes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, submission_id, original_name, mime_type, size_bytes, created_at
    `,[
      request.submission.id,
      request.user.id,
      request.file.originalname,
      request.file.filename,
      storageKey,
      request.file.mimetype,
      request.file.size
    ]);
    response.status(201).json({
      message: "Файл работы загружен",
      file: result.rows[0]
    });
  } catch (error) {
    if (request.file?.path) {
      await fs.promises.unlink(request.file.path).catch(() => {});
    }
    console.error("Ошибка сохранения файла работы:", error);
    response.status(500).json({ error: "Ошибка сохранения файла работы" });
  }
});

// Получить файлы работы студента
router.get("/assignments/:assignmentId/submission/files",requireAuth,requireStudent,requireStudentAssignmentAccess,async (request, response) => {
  try {
    const submissionResult = await pool.query(`
      SELECT id, status
      FROM student_submissions
      WHERE assignment_id = $1
        AND student_id = $2
    `,[request.assignment.id,request.user.id]);
    if (submissionResult.rowCount === 0) {
      return response.json([]);
    }
    const result = await pool.query(`
      SELECT id, submission_id, original_name, mime_type, size_bytes, created_at
      FROM submission_files
      WHERE submission_id = $1
      ORDER BY created_at, id
    `,[submissionResult.rows[0].id]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения файлов работы:", error);
    response.status(500).json({ error: "Ошибка получения файлов работы" });
  }
});

// Скачать файл работы студента
router.get("/submission-files/:id/download",requireAuth,requireStudent,async (request, response) => {
  try {
    const fileId = request.params.id;
    if (!/^\d+$/.test(fileId)) {
      return response.status(400).json({ error: "Некорректный идентификатор файла" });
    }
    const result = await pool.query(`
      SELECT
        sf.id,
        sf.original_name,
        sf.storage_key
      FROM submission_files sf
      JOIN student_submissions ss ON ss.id = sf.submission_id
      WHERE sf.id = $1
        AND ss.student_id = $2
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
      console.error("Ошибка скачивания файла работы:", error);
      if (!response.headersSent) {
        response.status(500).json({ error: "Ошибка скачивания файла" });
      }
    });
  } catch (error) {
    console.error("Ошибка получения файла работы:", error);
    response.status(500).json({ error: "Ошибка получения файла работы" });
  }
});

// Удалить файл работы студента
router.delete("/submission-files/:id",requireAuth,requireStudent,async (request, response) => {
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
        sf.id,
        sf.storage_key,
        ss.status
      FROM submission_files sf
      JOIN student_submissions ss ON ss.id = sf.submission_id
      WHERE sf.id = $1
        AND ss.student_id = $2
      FOR UPDATE OF sf
    `,[fileId,request.user.id]);
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return response.status(404).json({ error: "Файл не найден" });
    }
    const file = result.rows[0];
    if (!["draft","returned"].includes(file.status)) {
      await client.query("ROLLBACK");
      return response.status(409).json({
        error: file.status === "submitted" ? "Нельзя удалить файл отправленной работы" : "Нельзя удалить файл проверенной работы"
      });
    }
    const filePath = path.resolve(config.storageRoot,file.storage_key);
    const relativePath = path.relative(config.storageRoot,filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      await client.query("ROLLBACK");
      console.error("Некорректный путь файла:", file.storage_key);
      return response.status(500).json({ error: "Ошибка доступа к файлу" });
    }
    await client.query(`
      DELETE FROM submission_files
      WHERE id = $1
    `,[fileId]);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await client.query("COMMIT");
    response.json({ message: "Файл работы удалён" });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    console.error("Ошибка удаления файла работы:", error);
    response.status(500).json({ error: "Ошибка удаления файла работы" });
  } finally {
    if (client) client.release();
  }
});

async function requireStudentAssignmentAccess(request, response, next) {
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
      JOIN disciplines d ON d.id = c.discipline_id
      JOIN student_profiles sp ON sp.group_id = c.group_id
      WHERE a.id = $1
        AND sp.user_id = $2
        AND a.is_published = TRUE
        AND c.is_active = TRUE
        AND d.is_active = TRUE
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

async function requireEditableSubmission(request, response, next) {
  try {
    const result = await pool.query(`
      SELECT id, assignment_id, student_id, status
      FROM student_submissions
      WHERE assignment_id = $1
        AND student_id = $2
    `,[request.assignment.id,request.user.id]);

    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Сначала создайте работу" });
    }
    const submission = result.rows[0];
    if (!["draft","returned"].includes(submission.status)) {
      return response.status(409).json({
        error: submission.status === "submitted"
          ? "Работа уже отправлена преподавателю"
          : "Проверенная работа недоступна для изменения"
      });
    }
    request.submission = submission;
    next();
  } catch (error) {
    console.error("Ошибка проверки работы студента:", error);
    response.status(500).json({ error: "Ошибка проверки работы студента" });
  }
}

module.exports = router;
