const express = require("express");

const pool = require("../db");

const {
    requireAuth,
    requireTeacher
} = require("../middleware/auth");


const router = express.Router();

router.get("/pending", requireAuth, requireTeacher, async (request, response) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.last_name,
                u.first_name,
                u.middle_name,
                u.created_at,
                sp.student_number,
                g.id AS group_id,
                g.name AS group_name
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
        console.error(
            "Ошибка получения неподтвержденных студентов:",
            error
        );
        response.status(500).json({
            error: "Ошибка получения списка студентов"
        });
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
            RETURNING
                id,
                email,
                first_name,
                last_name,
                middle_name,
                role,
                status
            `,
            [studentId]
        );
        if (result.rowCount === 0) {

            return response.status(404).json({
                error: "Студент не найден или уже обработан"
            });
        }
        response.json({
            message: "Доступ студенту подтвержден",
            student: result.rows[0]
        });
    } catch (error) {
        console.error(
            "Ошибка подтверждения студента:",
            error
        );
        response.status(500).json({
            error: "Ошибка подтверждения студента"
        });
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
            RETURNING
                id,
                email,
                first_name,
                last_name,
                middle_name,
                role,
                status
            `,
            [studentId]
        );
        if (result.rowCount === 0) {

            return response.status(404).json({
                error: "Студент не найден или уже обработан"
            });
        }
        response.json({
            message: "Регистрация студента отклонена",
            student: result.rows[0]
        });
    } catch (error) {
        console.error(
            "Ошибка отклонения регистрации:",
            error
        );
        response.status(500).json({
            error: "Ошибка отклонения регистрации"
        });
    }
});


module.exports = router;