const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const session = require("express-session");
const pool = require("./db");
const config = require("./config");
const pgSession = require("connect-pg-simple")(session);
const authRoutes = require("./routes/auth");
const groupsRoutes = require("./routes/groups");
const studentRoutes = require("./routes/student");
const studentsRoutes =  require("./routes/students");
const teacherRoutes = require("./routes/teacher");
const teacherManagementRoutes = require("./routes/teacherManagement");
const adminRoutes = require("./routes/admin");
const app = express();

app.disable("x-powered-by");

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use((request, response, next) => {
  request.requestId = request.get("X-Request-Id") || crypto.randomUUID();
  response.set("X-Request-Id", request.requestId);
  next();
});

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: {
      directives: {
        "upgrade-insecure-requests": config.isProduction ? [] : null
      }
    }
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.frontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const error = new Error("Источник запроса не разрешён");
      error.status = 403;
      callback(error);
    },
    credentials: true
  })
);

app.use(express.json({ limit: "1mb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Повторите запрос позднее." }
});

app.use(["/api/auth/login", "/api/auth/register"], authLimiter);

app.get("/api/health", async (request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ok", requestId: request.requestId });
  } catch (error) {
    console.error(`[${request.requestId}] Проверка БД завершилась ошибкой:`, error);
    response.status(503).json({ status: "unavailable", requestId: request.requestId });
  }
});

app.use(express.static(config.frontendRoot));

app.get("/", (request, response) => {
  response.sendFile(path.join(config.frontendRoot, "index.html"));
});

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
      secure: config.sessionCookieSecure,
      sameSite: "lax",
      maxAge: config.sessionMaxAgeMs
    }
  })
);

// Routes
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

app.use(
  "/api/teacher",
  teacherRoutes
);

app.use(
  "/api/teacher",
  teacherManagementRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);

app.use("/api", (request, response) => {
  response.status(404).json({
    error: "Маршрут API не найден",
    requestId: request.requestId
  });
});

app.use((error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status = error.status || (error.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) {
    console.error(`[${request.requestId}] Необработанная ошибка:`, error);
  }

  const publicMessages = {
    400: error.type === "entity.parse.failed" ? "Некорректный JSON" : error.message,
    413: "Размер тела запроса превышает допустимый лимит",
    500: "Внутренняя ошибка сервера"
  };

  response.status(status).json({
    error: publicMessages[status] || error.message,
    requestId: request.requestId
  });
});


module.exports = app;
