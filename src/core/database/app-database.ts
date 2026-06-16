/**
 * Модуль ініціалізації та управління підключенням до бази даних SQLite.
 * Надає доступ до об'єкта бази даних та виконує міграції при запуску додатка.
 */
import * as SQLite from "expo-sqlite";
import { migrateDatabase } from "@/infrastructure/database/migrations";

export const DATABASE_NAME = "secure-notes.db";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const configureDatabase = async (database: SQLite.SQLiteDatabase) => {
  const journalMode = await database.getFirstAsync<{ journal_mode: string }>(
    "PRAGMA journal_mode"
  );

  if (journalMode?.journal_mode?.toLowerCase() !== "wal") {
    await database.execAsync("PRAGMA journal_mode = WAL;");
  }

  await database.execAsync("PRAGMA foreign_keys = ON;");
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await configureDatabase(database);
      await migrateDatabase(database);
      return database;
    })().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
};
