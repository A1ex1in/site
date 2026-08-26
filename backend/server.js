const express = require("express");
const cors = require("cors");
const pool = require("./db");
const argon2 = require("argon2");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// GET
app.get("/api/groups", async (request, response) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                description
            FROM student_groups
            WHERE is_active = TRUE
            ORDER BY name
        `);
        response.json(result.rows);
    } catch (error) {
        console.error("Ошибка получения групп:", error);
        response.status(500).json({
            error: "Ошибка получения списка групп"
        });
    }
});

app.get("/api/students/pending", async (request, response) => {
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

// POST
app.post("/api/auth/register", async (request, response) => {
    const client = await pool.connect();
    try {
        const {
            email,
            password,
            firstName,
            lastName,
            middleName,
            groupId,
            studentNumber
        } = request.body;
        if (!email || !password || !firstName || !lastName) {

            return response.status(400).json({
                error: "Не заполнены обязательные поля"
            });
        }
        const existingUser = await client.query(
            `
            SELECT id
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email]
        );
        if (existingUser.rowCount > 0) {
            return response.status(409).json({
                error: "Пользователь с таким email уже существует"
            });
        }
        if (groupId) {
            const groupResult = await client.query(
                `
                SELECT id
                FROM student_groups
                WHERE id = $1
                AND is_active = TRUE
                `,
                [groupId]
            );
            if (groupResult.rowCount === 0) {
                return response.status(400).json({
                    error: "Указанная учебная группа не существует"
                });
            }
        }
        const passwordHash = await argon2.hash(password);

        await client.query("BEGIN");
        const userResult = await client.query(
            `
            INSERT INTO users (
                email,
                password_hash,
                first_name,
                last_name,
                middle_name,
                role,
                status
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                'student',
                'pending'
            )
            RETURNING id
            `,
            [
                email,
                passwordHash,
                firstName,
                lastName,
                middleName || null
            ]
        );
        const userId = userResult.rows[0].id;
        await client.query(
            `
            INSERT INTO student_profiles (
                user_id,
                group_id,
                student_number
            )
            VALUES (
                $1,
                $2,
                $3
            )
            `,
            [
                userId,
                groupId || null,
                studentNumber || null
            ]
        );
        await client.query("COMMIT");

        response.status(201).json({
            message: "Регистрация выполнена. Ожидается подтверждение преподавателем.",
            userId: userId
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Ошибка регистрации:", error);
        response.status(500).json({
            error: "Ошибка регистрации"
        });
    } finally {
        client.release();
    }
});

// PUT


// PATCH
app.patch("/api/students/:id/approve", async (request, response) => {
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

app.patch("/api/students/:id/reject", async (request, response) => {
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

// DELETE



app.listen(port, () => {
    console.log(`Backend запущен: http://127.0.0.1:${port}`);
});