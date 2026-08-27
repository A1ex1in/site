require("dotenv").config();

const config = {

    port:
        Number(process.env.PORT) || 3000,

    frontendOrigin:
        process.env.FRONTEND_ORIGIN ||
        "http://127.0.0.1:3001",

    sessionSecret:
        process.env.SESSION_SECRET,

    db: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    }
};

module.exports = config;