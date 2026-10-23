const express = require("express");
const argon2 = require("argon2");
const pool = require("../db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { normalizeText, normalizeEmail, validatePassword, parseId } = require("../lib/validation");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", async (request, response) => {
  try {
    const [summary, statuses, teacherLoad, attendanceByGroup] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'teacher')::int AS teachers,
          (SELECT COUNT(*) FROM users WHERE role = 'student')::int AS students,
          (SELECT COUNT(*) FROM courses WHERE is_active = TRUE)::int AS active_courses,
          (SELECT COUNT(*) FROM lessons)::int AS lessons,
          (SELECT COUNT(*) FROM assignments WHERE is_published = TRUE)::int AS published_assignments,
          (SELECT COUNT(*) FROM student_submissions WHERE status IN ('submitted','returned'))::int AS pending_submissions,
          (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('present','late')) /
            NULLIF(COUNT(*) FILTER (WHERE status <> 'excused'), 0), 1) FROM lesson_attendance) AS attendance_rate
      `),
      pool.query(`
        SELECT role, status, COUNT(*)::int AS count
        FROM users
        WHERE role IN ('teacher','student')
        GROUP BY role, status
        ORDER BY role, status
      `),
      pool.query(`
        SELECT u.id, u.last_name, u.first_name, u.middle_name, u.email,
          (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = u.id AND c.is_active = TRUE)::int AS courses,
          (SELECT COUNT(DISTINCT c.group_id) FROM courses c WHERE c.teacher_id = u.id AND c.is_active = TRUE)::int AS groups,
          (SELECT COUNT(*) FROM lessons l JOIN courses c ON c.id = l.course_id WHERE c.teacher_id = u.id)::int AS lessons,
          (SELECT COUNT(*) FROM assignments a JOIN courses c ON c.id = a.course_id WHERE c.teacher_id = u.id)::int AS assignments,
          (SELECT COUNT(DISTINCT sp.user_id) FROM courses c JOIN student_profiles sp ON sp.group_id = c.group_id
            JOIN users s ON s.id = sp.user_id AND s.status = 'active'
            WHERE c.teacher_id = u.id AND c.is_active = TRUE)::int AS students
        FROM users u
        WHERE u.role = 'teacher' AND u.status = 'active'
        ORDER BY u.last_name, u.first_name
      `),
      pool.query(`
        SELECT sg.id, sg.name,
          COUNT(la.lesson_id)::int AS marked,
          COUNT(la.lesson_id) FILTER (WHERE la.status IN ('present','late'))::int AS attended,
          ROUND(100.0 * COUNT(la.lesson_id) FILTER (WHERE la.status IN ('present','late')) /
            NULLIF(COUNT(la.lesson_id) FILTER (WHERE la.status <> 'excused'), 0), 1) AS attendance_rate
        FROM student_groups sg
        LEFT JOIN courses c ON c.group_id = sg.id
        LEFT JOIN lessons l ON l.course_id = c.id
        LEFT JOIN lesson_attendance la ON la.lesson_id = l.id
        WHERE sg.is_active = TRUE
        GROUP BY sg.id, sg.name
        ORDER BY sg.name
      `)
    ]);

    response.json({
      summary: summary.rows[0],
      userStatuses: statuses.rows,
      teacherLoad: teacherLoad.rows,
      attendanceByGroup: attendanceByGroup.rows
    });
  } catch (error) {
    console.error("Ошибка получения статистики администратора:", error);
    response.status(500).json({ error: "Ошибка получения статистики" });
  }
});

router.get("/users", async (request, response) => {
  const role = request.query.role;
  if (role && !["teacher", "student"].includes(role)) {
    return response.status(400).json({ error: "Некорректная роль пользователя" });
  }
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.middle_name, u.phone,
        u.role, u.status, u.created_at, sp.student_number,
        sg.id AS group_id, sg.name AS group_name
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN student_groups sg ON sg.id = sp.group_id
      WHERE u.role IN ('teacher','student')
        AND ($1::text IS NULL OR u.role::text = $1)
      ORDER BY u.role, u.last_name, u.first_name
    `, [role || null]);
    response.json(result.rows);
  } catch (error) {
    console.error("Ошибка получения пользователей:", error);
    response.status(500).json({ error: "Ошибка получения пользователей" });
  }
});

router.post("/groups", async (request, response) => {
  const name = normalizeText(request.body?.name, { maxLength: 100, required: true });
  const description = normalizeText(request.body?.description, { maxLength: 1000 });
  if (!name || description === null) {
    return response.status(400).json({ error: "Проверьте название и описание группы" });
  }
  try {
    const result = await pool.query(`
      INSERT INTO student_groups (name, description)
      VALUES ($1, $2)
      RETURNING id, name, description, is_active, created_at
    `, [name, description || null]);
    response.status(201).json({ message: "Учебная группа создана", group: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return response.status(409).json({ error: "Группа с таким названием уже существует" });
    console.error("Ошибка создания группы администратором:", error);
    response.status(500).json({ error: "Ошибка создания учебной группы" });
  }
});

router.post("/users", async (request, response) => {
  const role = request.body?.role;
  const email = normalizeEmail(request.body?.email);
  const firstName = normalizeText(request.body?.firstName, { maxLength: 100, required: true });
  const lastName = normalizeText(request.body?.lastName, { maxLength: 100, required: true });
  const middleName = normalizeText(request.body?.middleName, { maxLength: 100 });
  const phone = normalizeText(request.body?.phone, { maxLength: 30 });
  const studentNumber = normalizeText(request.body?.studentNumber, { maxLength: 50 });
  const groupId = role === "student" ? parseId(request.body?.groupId) : null;
  const passwordError = validatePassword(request.body?.password);

  if (!["teacher", "student"].includes(role)) return response.status(400).json({ error: "Выберите роль" });
  if (!email) return response.status(400).json({ error: "Укажите корректный email" });
  if (!firstName || !lastName || middleName === null) return response.status(400).json({ error: "Проверьте ФИО" });
  if (phone === null || (phone && !/^[+\d()\-\s]{7,30}$/.test(phone))) {
    return response.status(400).json({ error: "Укажите корректный телефон" });
  }
  if (passwordError) return response.status(400).json({ error: passwordError });
  if (role === "student" && !groupId) return response.status(400).json({ error: "Выберите группу студента" });
  if (studentNumber === null) return response.status(400).json({ error: "Номер студента слишком длинный" });

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    if (role === "student") {
      const group = await client.query(`SELECT id FROM student_groups WHERE id = $1 AND is_active = TRUE`, [groupId]);
      if (group.rowCount === 0) {
        await client.query("ROLLBACK");
        return response.status(400).json({ error: "Учебная группа не найдена" });
      }
    }
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, middle_name, phone, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, email, first_name, last_name, middle_name, phone, role, status, created_at
    `, [email, await argon2.hash(request.body.password), firstName, lastName, middleName || null, phone || null, role]);
    if (role === "student") {
      await client.query(`
        INSERT INTO student_profiles (user_id, group_id, student_number)
        VALUES ($1, $2, $3)
      `, [userResult.rows[0].id, groupId, studentNumber || null]);
    }
    await client.query("COMMIT");
    response.status(201).json({ message: role === "teacher" ? "Преподаватель добавлен" : "Студент добавлен", user: userResult.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.code === "23505") {
      return response.status(409).json({ error: error.constraint === "student_number_unique" ? "Такой номер студента уже существует" : "Такой email уже используется" });
    }
    console.error("Ошибка создания пользователя:", error);
    response.status(500).json({ error: "Ошибка создания пользователя" });
  } finally {
    if (client) client.release();
  }
});

router.patch("/users/:id/status", async (request, response) => {
  const userId = parseId(request.params.id);
  const status = request.body?.status;
  if (!userId || !["active", "blocked"].includes(status)) {
    return response.status(400).json({ error: "Некорректные данные статуса" });
  }
  try {
    const result = await pool.query(`
      UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND role IN ('teacher','student')
      RETURNING id, role, status
    `, [status, userId]);
    if (result.rowCount === 0) return response.status(404).json({ error: "Пользователь не найден" });
    response.json({ message: status === "active" ? "Пользователь разблокирован" : "Пользователь заблокирован", user: result.rows[0] });
  } catch (error) {
    console.error("Ошибка изменения статуса пользователя:", error);
    response.status(500).json({ error: "Ошибка изменения статуса" });
  }
});

module.exports = router;
