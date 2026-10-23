const { Pool } = require("pg");
const config = require("./config");

const connectionOptions = config.databaseUrl
  ? { connectionString: config.databaseUrl }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password
    };

if (config.databaseSsl) {
  connectionOptions.ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
  ...connectionOptions,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on("error", (error) => {
  console.error("Неожиданная ошибка свободного подключения PostgreSQL:", error);
});


module.exports = pool;
