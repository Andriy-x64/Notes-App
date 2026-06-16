/**
 * Реалізація репозиторію нотаток на базі SQLite.
 * Виконує SQL-операції додавання, оновлення, видалення та фільтрації нотаток у базі даних.
 */
import { getDatabase } from "../database-client";
import type { NotesRepository } from "@/core/contracts/notes-repository.interface";
import type { Note } from "@/core/types/note";
import { stripHtml } from "@/shared/utils/strip-html";
import { resolveSortOptionForFolder } from "@/core/settings/settings-repository";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  content_plain: string;
  folder_id: string | null;
  created_at: number;
  updated_at: number;
  is_pinned: number;
}

const mapNoteRow = (row: NoteRow): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  contentPlain: row.content_plain ?? "",
  folderId: row.folder_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isPinned: row.is_pinned === 1,
});

/**
 * Реалізація репозиторію нотаток на базі бази даних SQLite.
 */
export class SqliteNotesRepository implements NotesRepository {
  /**
   * Отримує список нотаток для вказаної папки (або всього списку, якщо null) з урахуванням сортування та закріплення.
   */
  async getNotes(folderId: string | null): Promise<Note[]> {
    const database = await getDatabase();
    const resolvedOption = await resolveSortOptionForFolder(folderId);

    let orderSql = "";
    switch (resolvedOption) {
      case "title_asc":
        orderSql = "LOWER(title) ASC, id ASC";
        break;
      case "created_at_desc":
        orderSql = "created_at DESC, id ASC";
        break;
      case "updated_at_desc":
      case "manual":
      default:
        orderSql = "updated_at DESC, id ASC";
        break;
    }

    const query =
      folderId === null
        ? `SELECT * FROM notes WHERE folder_id IS NULL ORDER BY is_pinned DESC, ${orderSql}`
        : `SELECT * FROM notes WHERE folder_id = ? ORDER BY is_pinned DESC, ${orderSql}`;

    const rows =
      folderId === null
        ? await database.getAllAsync<NoteRow>(query)
        : await database.getAllAsync<NoteRow>(query, folderId);

    return rows.map(mapNoteRow);
  }

  /**
   * Знаходить нотатку за її унікальним ідентифікатором.
   */
  async getNote(id: string): Promise<Note | undefined> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<NoteRow>(
      "SELECT * FROM notes WHERE id = ?",
      id
    );

    return row ? mapNoteRow(row) : undefined;
  }

  /**
   * Додає запис нової нотатки у базу даних та створює початковий пошуковий індекс FTS.
   */
  async addNote(
    id: string,
    title: string,
    content: string,
    folderId: string | null,
    createdAt: number
  ): Promise<void> {
    const database = await getDatabase();
    const safeTitle = typeof title === "string" ? title : "Untitled";
    const safeContent = typeof content === "string" ? content : "";
    const plainText = stripHtml(safeContent);

    await database.runAsync(
      `INSERT INTO notes (id, title, content, content_plain, folder_id, created_at, updated_at, is_pinned)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      id,
      safeTitle,
      safeContent,
      plainText,
      folderId,
      createdAt,
      createdAt
    );

    await database.runAsync(
      `INSERT INTO notes_fts (id, title, content_plain)
       VALUES (?, ?, ?)`,
      id,
      safeTitle,
      plainText
    );
  }

  /**
   * Оновлює вміст, заголовок нотатки та оновлює її повнотекстовий індекс пошуку.
   */
  async updateNote(id: string, title: string, content: string): Promise<void> {
    const database = await getDatabase();
    const safeTitle = typeof title === "string" ? title : "Untitled";
    const safeContent = typeof content === "string" ? content : "";
    const plainText = stripHtml(safeContent);
    const now = Date.now();

    await database.runAsync(
      `UPDATE notes
       SET title = ?, content = ?, content_plain = ?, updated_at = ?
       WHERE id = ?`,
      safeTitle,
      safeContent,
      plainText,
      now,
      id
    );

    await database.runAsync("DELETE FROM notes_fts WHERE id = ?", id);

    await database.runAsync(
      `INSERT INTO notes_fts (id, title, content_plain)
       VALUES (?, ?, ?)`,
      id,
      safeTitle,
      plainText
    );
  }

  /**
   * Видаляє нотатку з бази даних, її пошукові індекси та пов'язані з нею нагадування.
   */
  async deleteNote(id: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM reminders WHERE note_id = ?", id);
    await database.runAsync("DELETE FROM notes WHERE id = ?", id);
    await database.runAsync("DELETE FROM notes_fts WHERE id = ?", id);
  }

  /**
   * Масово закріплює або відкріплює вибрані нотатки.
   */
  async togglePinNotes(ids: string[], pin: boolean): Promise<void> {
    const database = await getDatabase();
    const pinVal = pin ? 1 : 0;
    for (const id of ids) {
      await database.runAsync("UPDATE notes SET is_pinned = ? WHERE id = ?", pinVal, id);
    }
  }

  /**
   * Масово переміщує декілька нотаток у цільову папку.
   */
  async moveNotes(noteIds: string[], targetFolderId: string | null): Promise<void> {
    const uniqueNoteIds = Array.from(new Set(noteIds));
    if (uniqueNoteIds.length === 0) {
      return;
    }

    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (txn) => {
      const placeholders = uniqueNoteIds.map(() => "?").join(", ");

      if (targetFolderId === null) {
        await txn.runAsync(
          `UPDATE notes
           SET folder_id = NULL
           WHERE id IN (${placeholders})
             AND folder_id IS NOT NULL`,
          ...uniqueNoteIds
        );
        return;
      }

      await txn.runAsync(
        `UPDATE notes
         SET folder_id = ?
         WHERE id IN (${placeholders})
           AND (folder_id IS NULL OR folder_id <> ?)`,
        targetFolderId,
        ...uniqueNoteIds,
        targetFolderId
      );
    });
  }

  /**
   * Повертає статус блокування нотатки (якщо колонка is_locked присутня в таблиці).
   */
  async getNoteLockStatus(noteId: string): Promise<boolean> {
    const database = await getDatabase();
    try {
      const hasIsLocked = await database.getFirstAsync<{ count: number }>(
        "SELECT count(*) AS count FROM pragma_table_info('notes') WHERE name = 'is_locked'"
      );
      if (hasIsLocked && hasIsLocked.count > 0) {
        const lockRow = await database.getFirstAsync<{ is_locked: number }>(
          "SELECT is_locked FROM notes WHERE id = ?",
          noteId
        );
        return lockRow?.is_locked === 1;
      }
    } catch (e) {
      console.warn("Failed to check note lock status dynamically:", e);
    }
    return false;
  }

  /**
   * Отримує чистий текстовий вміст (без HTML) нотатки за її ID.
   */
  async getNoteContentPlain(noteId: string): Promise<string> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{ content_plain: string }>(
      "SELECT content_plain FROM notes WHERE id = ?",
      noteId
    );
    return row?.content_plain ?? "";
  }
}
