const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const config = require("../config");
const { requireAuth, requireStudent } = require("../middleware/auth");

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

module.exports = router;
