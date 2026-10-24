const fs = require("fs");
const path = require("path");
const pool = require("../db");
const config = require("../config");

const confirmationFlag = "--confirm";

async function main() {
  if (config.isProduction) {
    throw new Error("Сброс базы запрещён при NODE_ENV=production");
  }
  if (!process.argv.includes(confirmationFlag)) {
    throw new Error(`Сброс удаляет все данные. Для подтверждения добавьте ${confirmationFlag}`);
  }

  const databaseDirectory = path.resolve(__dirname,"..","..","database");
  const resetSql = fs.readFileSync(path.join(databaseDirectory,"reset.sql"),"utf8");
  const seedSql = fs.readFileSync(path.join(databaseDirectory,"seed.sql"),"utf8");
  const checksSql = fs.readFileSync(path.join(databaseDirectory,"checks.sql"),"utf8");

  console.log("Очищаем данные разработки...");
  await pool.query(resetSql);
  console.log("Создаём демонстрационный учебный курс...");
  await pool.query(seedSql);
  const checks = await pool.query(checksSql);

  console.table(checks.rows);
  if (checks.rows.some((row) => row["Результат"] !== "OK")) {
    throw new Error("Не все проверки тестовых данных завершились успешно");
  }
  console.log("База очищена и заполнена заново.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
