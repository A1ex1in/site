const express = require("express");
const cors = require("cors");
const session = require("express-session");
const argon2 = require("argon2");

const pool = require("./db");

const pgSession = require("connect-pg-simple")(session);

const app = express();
const port = 3000;

// CORS
app.use(
    cors({
        origin: "http://127.0.0.1:3001",
        credentials: true
    })
);

// JSON body parser
app.use(express.json());

// Sessions
app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: "user_sessions"
        }),
        name: "site.sid",
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

async function requireAuth(request, response, next) {
    if (!request.session.user) {
        return response.status(401).json({
            error: "Необходима авторизация"
        });
    }
    try {
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                first_name,
                last_name,
                middle_name,
                role,
                status
            FROM users
            WHERE id = $1
            `,
            [request.session.user.id]
        );
        if (result.rowCount === 0) {
            request.session.destroy(() => {});
            return response.status(401).json({
                error: "Пользователь не найден"
            });
        }
        const user = result.rows[0];
        if (user.status !== "active") {
            request.session.destroy(() => {});
            return response.status(403).json({
                error: "Учётная запись недоступна"
            });
        }
        request.user = user;
        next();
    } catch (error) {
        console.error(
            "Ошибка проверки авторизации:",
            error
        );
        response.status(500).json({
            error: "Ошибка проверки авторизации"
        });
    }
}

function requireTeacher(request, response, next) {
    if (request.user.role !== "teacher") {
        return response.status(403).json({
            error: "Доступ разрешён только преподавателю"
        });
    }
    next();
}

// GET
app.get("/api/auth/me", requireAuth, (request, response) => {
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

app.get("/api/students/pending", requireAuth, requireTeacher, async (request, response) => {
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
app.post("/api/auth/logout", requireAuth, (request, response) => {
    request.session.destroy((error) => {
        if (error) {
            console.error(
                "Ошибка завершения сессии:",
                error
            );
            return response.status(500).json({
                error: "Не удалось выйти из системы"
            });
        }
        response.clearCookie("site.sid");
        response.json({
            message: "Выход выполнен"
        });
    });
});

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

app.post("/api/auth/login", async (request, response) => {
    try {
        const {
            email,
            password
        } = request.body;
        if (!email || !password) {
            return response.status(400).json({
                error: "Необходимо указать email и пароль"
            });
        }
        const result = await pool.query(
            `
            SELECT
                id,
                email,
                password_hash,
                first_name,
                last_name,
                middle_name,
                role,
                status
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email.trim()]
        );
        if (result.rowCount === 0) {
            return response.status(401).json({
                error: "Неверный email или пароль"
            });
        }
        const user = result.rows[0];
        const passwordIsValid =
            await argon2.verify(
                user.password_hash,
                password
            );
        if (!passwordIsValid) {
            return response.status(401).json({
                error: "Неверный email или пароль"
            });
        }
        if (user.status !== "active") {
            if (user.status === "pending") {
                return response.status(403).json({
                    error: "Регистрация ещё не подтверждена преподавателем"
                });
            }
            if (user.status === "rejected") {
                return response.status(403).json({
                    error: "Регистрация отклонена"
                });
            }
            if (user.status === "blocked") {
                return response.status(403).json({
                    error: "Учётная запись заблокирована"
                });
            }
            return response.status(403).json({
                error: "Доступ к учётной записи запрещён"
            });
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
        console.error(
            "Ошибка авторизации:",
            error
        );
        response.status(500).json({
            error: "Ошибка авторизации"
        });
    }
});

// PUT


// PATCH
app.patch("/api/students/:id/approve",requireAuth,requireTeacher,async (request, response) => {
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

app.patch("/api/students/:id/reject",requireAuth,requireTeacher,async (request, response) => {
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