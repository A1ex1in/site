const express = require("express");
const cors = require("cors");
const session = require("express-session");

const pool = require("./db");
const config = require("./config");


const pgSession =
    require("connect-pg-simple")(session);


const authRoutes =
    require("./routes/auth");

const groupsRoutes =
    require("./routes/groups");

const studentRoutes =
    require("./routes/student");

const studentsRoutes =
    require("./routes/students");


const app = express();


// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------

app.use(
    cors({
        origin: config.frontendOrigin,
        credentials: true
    })
);


// ------------------------------------------------------------
// JSON
// ------------------------------------------------------------

app.use(express.json());


// ------------------------------------------------------------
// Sessions
// ------------------------------------------------------------

app.use(
    session({
        store: new pgSession({
            pool: pool,
            tableName: "user_sessions"
        }),

        name: "site.sid",

        secret: config.sessionSecret,

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


// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/groups",
    groupsRoutes
);

app.use(
    "/api/student",
    studentRoutes
);

app.use(
    "/api/students",
    studentsRoutes
);


module.exports = app;