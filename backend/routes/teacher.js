const express = require("express");
const pool = require("../db");
const { requireAuth, requireTeacher } = require("../middleware/auth");
const router = express.Router();

// ------------------------------------------------------------
// Создать дисциплину
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Получить все дисциплины
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Получить все группы
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Создать группу
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Получить студентов выбранной группы
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Получить профиль конкретного студента
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Изменить группу студента
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// Изменить статус студента
// ------------------------------------------------------------

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


module.exports = router;
