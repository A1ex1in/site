const app = require("./app");
const pool = require("./db");
const config = require("./config");

config.validateConfig();

const server = app.listen(config.port, config.host, () => {
  console.log(`Приложение запущено: http://${config.host}:${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: корректное завершение работы`);

  server.close(async (error) => {
    if (error) {
      console.error("Ошибка остановки HTTP-сервера:", error);
      process.exitCode = 1;
    }

    try {
      await pool.end();
    } catch (poolError) {
      console.error("Ошибка закрытия подключений к БД:", poolError);
      process.exitCode = 1;
    }

    process.exit();
  });

  setTimeout(() => {
    console.error("Принудительное завершение после тайм-аута");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
