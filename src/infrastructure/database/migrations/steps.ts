/**
 * Кроки міграцій для бази даних.
 * Містить SQL-скрипти створення таблиць folders, notes, reminders та індексації FTS5 для пошуку.
 */
import * as SQLite from "expo-sqlite";
import { stripHtml } from "@/shared/utils/strip-html";

export interface MigrationStep {
  version: number;
  run(database: SQLite.SQLiteDatabase): Promise<void>;
}

export const migrationSteps: MigrationStep[] = [
  {
    version: 1,
    async run(db) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          folder_id TEXT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS notes_updated_at_index
          ON notes (updated_at DESC);
      `);
    },
  },
  {
    version: 2,
    async run(db) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS folders (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          parent_id TEXT NULL
        );
        CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
          id UNINDEXED,
          title,
          clean_content
        );
      `);
    },
  },
  {
    version: 3,
    async run(db) {
      const sortOrderColumn = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pragma_table_info('folders') WHERE name = 'sort_order'"
      );
      if ((sortOrderColumn?.count ?? 0) === 0) {
        await db.execAsync(`
          ALTER TABLE folders
            ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        `);
      }
    },
  },
  {
    version: 4,
    async run(db) {
      const notesFolderIdColumn = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pragma_table_info('notes') WHERE name = 'folder_id'"
      );
      const foldersParentIdColumn = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pragma_table_info('folders') WHERE name = 'parent_id'"
      );

      if ((notesFolderIdColumn?.count ?? 0) === 0) {
        await db.execAsync("ALTER TABLE notes ADD COLUMN folder_id TEXT NULL;");
      }

      if ((foldersParentIdColumn?.count ?? 0) === 0) {
        await db.execAsync("ALTER TABLE folders ADD COLUMN parent_id TEXT NULL;");
      }
    },
  },
  {
    version: 5,
    async run(db) {
      await db.execAsync(`
        DELETE FROM notes_fts;
        INSERT INTO notes_fts (id, title, clean_content)
        SELECT id, title, content FROM notes;

        CREATE TRIGGER IF NOT EXISTS notes_fts_after_insert
        AFTER INSERT ON notes
        BEGIN
          INSERT INTO notes_fts (id, title, clean_content)
          VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_fts_after_update
        AFTER UPDATE ON notes
        BEGIN
          DELETE FROM notes_fts WHERE id = old.id;
          INSERT INTO notes_fts (id, title, clean_content)
          VALUES (new.id, new.title, new.content);
        END;

        CREATE TRIGGER IF NOT EXISTS notes_fts_after_delete
        AFTER DELETE ON notes
        BEGIN
          DELETE FROM notes_fts WHERE id = old.id;
        END;
      `);
    },
  },
  {
    version: 6,
    async run(db) {
      await db.execAsync(`
        ALTER TABLE notes ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
        CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes (is_pinned DESC);
        ALTER TABLE folders ADD COLUMN sort_setting TEXT DEFAULT NULL;
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
    },
  },
  {
    version: 7,
    async run(db) {
      await db.execAsync("ALTER TABLE notes ADD COLUMN content_plain TEXT NOT NULL DEFAULT '';");

      await db.execAsync(`
        DROP TRIGGER IF EXISTS notes_fts_after_insert;
        DROP TRIGGER IF EXISTS notes_fts_after_update;
        DROP TRIGGER IF EXISTS notes_fts_after_delete;
        DROP TABLE IF EXISTS notes_fts;
      `);

      await db.execAsync(`
        CREATE VIRTUAL TABLE notes_fts USING fts5(
          id UNINDEXED,
          title,
          content_plain,
          tokenize='unicode61'
        );
      `);

      const notesList = await db.getAllAsync<{ id: string; title: string; content: string }>(
        "SELECT id, title, content FROM notes"
      );

      for (const note of notesList) {
        const plainText = stripHtml(note.content);
        await db.runAsync(
          "UPDATE notes SET content_plain = ? WHERE id = ?",
          plainText,
          note.id
        );
        await db.runAsync(
          "INSERT INTO notes_fts (id, title, content_plain) VALUES (?, ?, ?)",
          note.id,
          note.title,
          plainText
        );
      }
    },
  },
  {
    version: 8,
    async run(db) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY NOT NULL,
          note_id TEXT NOT NULL UNIQUE,
          trigger_at INTEGER NOT NULL,
          is_completed INTEGER NOT NULL DEFAULT 0,
          title_snapshot TEXT NOT NULL,
          notification_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_reminders_note_id ON reminders (note_id);
      `);
    },
  },
  {
    version: 9,
    async run(db) {
      const hasIsCompleted = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pragma_table_info('reminders') WHERE name = 'is_completed'"
      );
      if ((hasIsCompleted?.count ?? 0) === 0) {
        await db.execAsync("ALTER TABLE reminders ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0;");
      }
    },
  },
  {
    version: 10,
    async run(db) {
      const parentFolderColumn = await db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM pragma_table_info('folders') WHERE name = 'parent_folder_id'"
      );

      if ((parentFolderColumn?.count ?? 0) === 0) {
        await db.execAsync("ALTER TABLE folders ADD COLUMN parent_folder_id TEXT NULL;");
      }

      await db.execAsync(`
        UPDATE folders
        SET parent_folder_id = parent_id
        WHERE parent_folder_id IS NULL
          AND parent_id IS NOT NULL;

        CREATE INDEX IF NOT EXISTS idx_folders_parent_folder
          ON folders(parent_folder_id);
      `);
    },
  },
];
