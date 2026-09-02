const express = require("express");
const argon2 = require("argon2");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

router.get("/me", requireAuth, (request, response) => {
        response.json({
            user: {
                id: request.user.id,
                email: request.user.email,
                firstName: request.user.first_name,
                lastName: request.user.last_name,
                middleName: request.user.middle_name,
                role: request.user.role,
                status: request.user.status
            }
        });
    }
);

router.post("/logout", requireAuth, (request, response) => {
    request.session.destroy((error) => {
        if (error) {
            console.error("Ошибка завершения сессии:", error);
            return response.status(500).json({ error: "Не удалось выйти из системы" });
        }
        response.clearCookie("site.sid");
        response.json({ message: "Выход выполнен" });
    });
});

router.post("/register", async (request, response) => {
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
            return response.status(400).json({ error: "Не заполнены обязательные поля" });
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
            return response.status(409).json({ error: "Пользователь с таким email уже существует" });
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
                return response.status(400).json({ error: "Указанная учебная группа не существует" });
            }
        }
        const passwordHash = await argon2.hash(password);
        await client.query("BEGIN");
        const userResult = await client.query(
            `
            INSERT INTO users (email, password_hash, first_name, last_name, middle_name, role, status)
            VALUES ($1, $2, $3, $4, $5, 'student', 'pending')
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
            INSERT INTO student_profiles (user_id, group_id, student_number)
            VALUES ($1, $2, $3)
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
        response.status(500).json({ error: "Ошибка регистрации" });
    } finally {
        client.release();
    }
});

router.post("/login", async (request, response) => {
    try {
        const {
            email,
            password
        } = request.body;
        if (!email || !password) {
            return response.status(400).json({ error: "Необходимо указать email и пароль" });
        }
        const result = await pool.query(
            `
            SELECT id, email, password_hash, first_name, last_name, middle_name, role, status
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email.trim()]
        );
        if (result.rowCount === 0) {
            return response.status(401).json({ error: "Неверный email или пароль" });
        }
        const user = result.rows[0];
        const passwordIsValid =
            await argon2.verify(
                user.password_hash,
                password
            );
        if (!passwordIsValid) {
            return response.status(401).json({ error: "Неверный email или пароль" });
        }
        if (user.status !== "active") {
            if (user.status === "pending") {
                return response.status(403).json({ error: "Регистрация ещё не подтверждена преподавателем" });
            }
            if (user.status === "rejected") {
                return response.status(403).json({ error: "Регистрация отклонена" });
            }
            if (user.status === "blocked") {
                return response.status(403).json({ error: "Учётная запись заблокирована" });
            }
            return response.status(403).json({ error: "Доступ к учётной записи запрещён" });
        }
        await new Promise((resolve, reject) => {
            request.session.regenerate((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        request.session.user = {
            id: user.id,
            role: user.role
        };
        response.json({
            message: "Вход выполнен",
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                middleName: user.middle_name,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error("Ошибка авторизации:", error);
        response.status(500).json({ error: "Ошибка авторизации" });
    }
});


module.exports = router;
