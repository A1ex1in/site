const express = require("express");
const pool = require("../db");
const { requireAuth, requireTeacher } = require("../middleware/auth");
const { parseId, normalizeText } = require("../lib/validation");
const router = express.Router();

router.get("/", requireAuth, requireTeacher, async (request, response) => {
  const allowedStatuses = new Set(["pending", "active", "rejected", "blocked"]);
  const status = request.query.status == null ? null : String(request.query.status);
  const groupId = request.query.groupId == null ? null : parseId(request.query.groupId);
  const search = normalizeText(request.query.search, { maxLength: 100 });
  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit, 10) || 25));

  if (status && !allowedStatuses.has(status)) {
    return response.status(400).json({ error: "Некорректный статус студента" });
  }
  if (request.query.groupId != null && !groupId) {
    return response.status(400).json({ error: "Некорректный идентификатор группы" });
  }
  if (search === null) {
    return response.status(400).json({ error: "Поисковый запрос слишком длинный" });
  }

  try {
    const values = [status, groupId, search || null, limit, (page - 1) * limit];
    const result = await pool.query(
      `
      SELECT
        u.id, u.email, u.last_name, u.first_name, u.middle_name, u.phone,
        u.status, u.created_at, sp.student_number,
        g.id AS group_id, g.name AS group_name,
        (COUNT(*) OVER())::integer AS total_count
      FROM users u
      JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN student_groups g ON g.id = sp.group_id
      WHERE u.role = 'student'
        AND ($1::user_status IS NULL OR u.status = $1)
        AND ($2::bigint IS NULL OR sp.group_id = $2)
        AND (
          $3::text IS NULL
          OR u.email ILIKE '%' || $3 || '%'
          OR u.first_name ILIKE '%' || $3 || '%'
          OR u.last_name ILIKE '%' || $3 || '%'
          OR COALESCE(sp.student_number, '') ILIKE '%' || $3 || '%'
        )
      ORDER BY u.last_name, u.first_name, u.id
      LIMIT $4 OFFSET $5
      `,
      values
    );

    response.json({
      items: result.rows.map(({ total_count, ...student }) => student),
      pagination: {
        page,
        limit,
        total: result.rows[0]?.total_count || 0
      }
    });
  } catch (error) {
    console.error("Ошибка получения списка студентов:", error);
    response.status(500).json({ error: "Ошибка получения списка студентов" });
  }
});

router.get("/pending", requireAuth, requireTeacher, async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.last_name, u.first_name, u.middle_name, u.phone,
        u.created_at, sp.student_number, g.id AS group_id, g.name AS group_name
      FROM users u
      JOIN student_profiles sp
        ON sp.user_id = u.id
      LEFT JOIN student_groups g
        ON g.id = sp.group_id
      WHERE u.role = 'student'
        AND u.status = 'pending'
      ORDER BY u.created_at
    `);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения неподтвержденных студентов:", error);
    response.status(500).json({ error: "Ошибка получения списка студентов" });
  }
});

router.patch("/:id/approve",requireAuth,requireTeacher,async (request, response) => {
  try {
    const studentId = request.params.id;
    const result = await pool.query(
      `
      UPDATE users
      SET
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND role = 'student'
        AND status = 'pending'
      RETURNING id, email, first_name, last_name, middle_name, role, status
      `,
      [studentId]
    );
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Студент не найден или уже обработан" });
    }
    response.json({
      message: "Доступ студенту подтвержден",
      student: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка подтверждения студента:", error);
    response.status(500).json({ error: "Ошибка подтверждения студента" });
  }
});

router.patch("/:id/reject",requireAuth,requireTeacher,async (request, response) => {
  try {
    const studentId = request.params.id;
    const result = await pool.query(
      `
      UPDATE users
      SET
        status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
        AND role = 'student'
        AND status = 'pending'
      RETURNING id, email, first_name, last_name, middle_name, role, status
      `,
      [studentId]
    );
    if (result.rowCount === 0) {
      return response.status(404).json({ error: "Студент не найден или уже обработан" });
    }
    response.json({
      message: "Регистрация студента отклонена",
      student: result.rows[0]
    });
  } catch (error) {
    console.error("Ошибка отклонения регистрации:", error);
    response.status(500).json({ error: "Ошибка отклонения регистрации" });
  }
});

module.exports = router;
