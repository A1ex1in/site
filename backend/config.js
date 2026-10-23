require("dotenv").config();
const path = require("path");

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";
const defaultOrigins = [
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3001",
  "http://localhost:3001"
];

const config = {
  nodeEnv,
  isProduction,
  host: process.env.HOST || "127.0.0.1",
  port: parseInteger(process.env.PORT, 3000),
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  frontendOrigins: (process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN || defaultOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  sessionSecret: process.env.SESSION_SECRET || "development-only-secret-change-before-production",
  sessionMaxAgeMs: parseInteger(process.env.SESSION_MAX_AGE_HOURS, 8) * 60 * 60 * 1000,
  sessionCookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction),
  storageRoot: path.resolve(process.env.STORAGE_ROOT || path.join(__dirname, "storage")),
  frontendRoot: path.resolve(process.env.FRONTEND_ROOT || path.join(__dirname, "..", "frontend")),
  requireLegalConsents: parseBoolean(process.env.REQUIRE_LEGAL_CONSENTS, isProduction),
  privacyPolicyVersion: process.env.PRIVACY_POLICY_VERSION || "1.0",
  userAgreementVersion: process.env.USER_AGREEMENT_VERSION || "1.0",
  databaseUrl: process.env.DATABASE_URL || null,
  databaseSsl: parseBoolean(process.env.DB_SSL, false),
  db: {
    host: process.env.DB_HOST,
    port: parseInteger(process.env.DB_PORT, 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
};

function validateConfig() {
  const errors = [];

  if (!config.databaseUrl) {
    for (const [name, value] of Object.entries({
      DB_HOST: config.db.host,
      DB_NAME: config.db.database,
      DB_USER: config.db.user,
      DB_PASSWORD: config.db.password
    })) {
      if (!value) errors.push(`Не задана переменная окружения ${name}`);
    }
  }

  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    errors.push("SESSION_SECRET должен содержать не менее 32 символов");
  }

  if (config.isProduction && config.sessionSecret.startsWith("development-only")) {
    errors.push("Для production необходимо задать собственный SESSION_SECRET");
  }

  if (config.requireLegalConsents && (!config.privacyPolicyVersion || !config.userAgreementVersion)) {
    errors.push("Для обязательных согласий необходимо указать версии юридических документов");
  }

  if (errors.length > 0) {
    const error = new Error(`Ошибка конфигурации:\n- ${errors.join("\n- ")}`);
    error.code = "INVALID_CONFIGURATION";
    throw error;
  }
}

module.exports = { ...config, validateConfig, parseBoolean };
