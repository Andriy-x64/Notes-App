/**
 * Система міграцій бази даних SQLite.
 * Визначає структуру таблиць та послідовно застосовує кроки оновлення схеми бази даних.
 */
import * as SQLite from "expo-sqlite";
import { migrationSteps } from "./steps";

export const migrateDatabase = async (database: SQLite.SQLiteDatabase) => {
  const targetVersion = 10;

  // 1. Отримуємо поточну версію
  const result = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= targetVersion) {
    return;
  }

  // 2. Переконуємося, що таблиця migration_history існує для відстеження статусу
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS migration_history (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      success INTEGER NOT NULL
    );
  `);

  // 3. Заповнюємо історію для версій, які вже були застосовані до появи migration_history
  if (currentVersion > 0) {
    for (let v = 1; v <= currentVersion; v++) {
      await database.runAsync(
        "INSERT OR IGNORE INTO migration_history (version, applied_at, success) VALUES (?, ?, 1)",
        v,
        Date.now()
      );
    }
  }

  // 4. Послідовно застосовуємо незастосовані кроки міграції
  const stepsToApply = migrationSteps.filter(
    (step) => step.version > currentVersion && step.version <= targetVersion
  );

  for (const step of stepsToApply) {
    console.log(`Applying database migration to version ${step.version}...`);
    try {
      await database.withTransactionAsync(async () => {
        // Запуск логіки міграції
        await step.run(database);
        // Запис в історію міграцій
        await database.runAsync(
          "INSERT OR REPLACE INTO migration_history (version, applied_at, success) VALUES (?, ?, 1)",
          step.version,
          Date.now()
        );
        // Оновлюємо внутрішній лічильник версій SQLite
        await database.execAsync(`PRAGMA user_version = ${step.version}`);
      });

      // 5. Перевірка цілісності бази даних після міграції
      const checkResult = await database.getFirstAsync<{ integrity_check: string }>(
        "PRAGMA integrity_check"
      );
      if (checkResult?.integrity_check !== "ok") {
        throw new Error(`Database integrity check failed: ${checkResult?.integrity_check}`);
      }
    } catch (error) {
      console.error(`Failed to apply migration version ${step.version}:`, error);
      // Записуємо помилку поза межами транзакції, що була відкочена
      try {
        await database.runAsync(
          "INSERT OR REPLACE INTO migration_history (version, applied_at, success) VALUES (?, ?, 0)",
          step.version,
          Date.now()
        );
      } catch {
        // Ігноруємо другорядну помилку
      }
      throw error; // Повторно викидаємо помилку, щоб зупинити запуск БД у разі невдачі
    }
  }

  console.log("Database migrations completed successfully.");
};
