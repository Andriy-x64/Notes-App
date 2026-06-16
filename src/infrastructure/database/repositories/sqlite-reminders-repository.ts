/**
 * Реалізація репозиторію нагадувань на базі SQLite.
 * Працює безпосередньо з таблицею reminders для збереження, оновлення та вилучення нагадувань.
 */
import type { RemindersRepository } from "@/core/contracts/reminders-repository.interface";
import type { ReminderDbItem } from "@/core/types/reminder";
import { getDatabase } from "../database-client";

//Реалізація репозиторію нагадувань на базі бази даних SQLite.
export class SqliteRemindersRepository implements RemindersRepository {
  //Отримує список нагадувань з бази даних відповідно до вказаного фільтра (all, completed, overdue, scheduled).
  async getReminders(
    filter: "all" | "completed" | "overdue" | "scheduled",
  ): Promise<ReminderDbItem[]> {
    const database = await getDatabase();
    const now = Date.now();

    let query = `
      SELECT r.id, r.note_id, r.trigger_at, r.is_completed, r.title_snapshot,
             r.notification_id, r.created_at, r.updated_at,
             n.title AS note_title, n.content_plain AS note_content
      FROM reminders r
      LEFT JOIN notes n ON r.note_id = n.id
    `;

    const params: any[] = [];

    switch (filter) {
      case "completed":
        query += " WHERE r.is_completed = 1";
        break;
      case "overdue":
        query += " WHERE r.is_completed = 0 AND r.trigger_at < ?";
        params.push(now);
        break;
      case "scheduled":
        query += " WHERE r.is_completed = 0 AND r.trigger_at >= ?";
        params.push(now);
        break;
      case "all":
      default:
        break;
    }

    query += " ORDER BY r.trigger_at ASC";

    return database.getAllAsync<ReminderDbItem>(query, ...params);
  }

  // Створює новий запис нагадування в таблиці `reminders`.
  async createReminder(
    id: string,
    noteId: string,
    triggerAt: number,
    titleSnapshot: string,
    notificationId: string,
    createdAt: number,
    updatedAt: number,
  ): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO reminders (id, note_id, trigger_at, is_completed, title_snapshot, notification_id, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?, ?, ?)`,
      id,
      noteId,
      triggerAt,
      titleSnapshot,
      notificationId,
      createdAt,
      updatedAt,
    );
  }

  // Оновлює параметри існуючого нагадування (час спрацьовування, заголовок, ID сповіщення).
  async updateReminder(
    noteId: string,
    triggerAt: number,
    titleSnapshot: string,
    notificationId: string,
    updatedAt: number,
  ): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE reminders SET trigger_at = ?, is_completed = 0, title_snapshot = ?, notification_id = ?, updated_at = ? WHERE note_id = ?",
      triggerAt,
      titleSnapshot,
      notificationId,
      updatedAt,
      noteId,
    );
  }

  // Записує новий ідентифікатор сповіщення в ОС для конкретного нагадування.
  async setReminderNotification(
    noteId: string,
    notificationId: string,
  ): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE reminders SET notification_id = ?, updated_at = ? WHERE note_id = ?",
      notificationId,
      Date.now(),
      noteId,
    );
  }

  //Змінює статус виконання нагадування.
  async toggleReminderStatus(
    noteId: string,
    isCompleted: boolean,
  ): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE reminders SET is_completed = ?, updated_at = ? WHERE note_id = ?",
      isCompleted ? 1 : 0,
      Date.now(),
      noteId,
    );
  }

  // Видаляє запис нагадування з таблиці `reminders` за ID нотатки.
  async deleteReminderRecord(noteId: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM reminders WHERE note_id = ?", noteId);
  }

  //Повертає статус нагадування для вказаної нотатки.
  async getReminderForNote(noteId: string): Promise<{
    triggerAt: number;
    titleSnapshot: string;
    notificationId: string;
    isCompleted: number;
  } | null> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<{
      trigger_at: number;
      title_snapshot: string;
      notification_id: string;
      is_completed: number;
    }>(
      "SELECT trigger_at, title_snapshot, notification_id, is_completed FROM reminders WHERE note_id = ?",
      noteId,
    );

    if (!row) {
      return null;
    }

    return {
      triggerAt: row.trigger_at,
      titleSnapshot: row.title_snapshot,
      notificationId: row.notification_id,
      isCompleted: row.is_completed,
    };
  }

  // Повертає список усіх активних (невиконаних) нагадувань.
  async getActiveReminders(): Promise<
    {
      id: string;
      note_id: string;
      trigger_at: number;
      title_snapshot: string;
      notification_id: string;
    }[]
  > {
    const database = await getDatabase();
    return database.getAllAsync<{
      id: string;
      note_id: string;
      trigger_at: number;
      title_snapshot: string;
      notification_id: string;
    }>(
      "SELECT id, note_id, trigger_at, title_snapshot, notification_id FROM reminders WHERE is_completed = 0",
    );
  }

  //Повертає список усіх нотаток, для яких ще немає призначених нагадувань.
  async getNotesWithoutReminders(): Promise<{ id: string; title: string }[]> {
    const database = await getDatabase();
    return database.getAllAsync<{ id: string; title: string }>(
      `SELECT id, title FROM notes
       WHERE id NOT IN (SELECT note_id FROM reminders)
       ORDER BY updated_at DESC`,
    );
  }
}
