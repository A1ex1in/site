const pool = require("../db");


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


function requireStudent(request, response, next) {

    if (request.user.role !== "student") {
        return response.status(403).json({
            error: "Доступ разрешён только студенту"
        });
    }

    next();
}


module.exports = {
    requireAuth,
    requireTeacher,
    requireStudent
};