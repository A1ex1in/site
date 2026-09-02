const express = require("express");
const pool = require("../db");
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


module.exports = router;
