/**
 * Інтерфейс репозиторію для збереження нагадувань.
 * Визначає методи взаємодії з базою даних у частині створення, зчитування та видалення записів про нагадування.
 */
import type { ReminderDbItem } from "../types/reminder";

export interface RemindersRepository {
  getReminders(
    filter: "all" | "completed" | "overdue" | "scheduled"
  ): Promise<ReminderDbItem[]>;
  createReminder(
    id: string,
    noteId: string,
    triggerAt: number,
    titleSnapshot: string,
    notificationId: string,
    createdAt: number,
    updatedAt: number
  ): Promise<void>;
  updateReminder(
    noteId: string,
    triggerAt: number,
    titleSnapshot: string,
    notificationId: string,
    updatedAt: number
  ): Promise<void>;
  setReminderNotification(noteId: string, notificationId: string): Promise<void>;
  toggleReminderStatus(noteId: string, isCompleted: boolean): Promise<void>;
  deleteReminderRecord(noteId: string): Promise<void>;
  getReminderForNote(
    noteId: string
  ): Promise<{
    triggerAt: number;
    titleSnapshot: string;
    notificationId: string;
    isCompleted: number;
  } | null>;
  getActiveReminders(): Promise<
    {
      id: string;
      note_id: string;
      trigger_at: number;
      title_snapshot: string;
      notification_id: string;
    }[]
  >;
  getNotesWithoutReminders(): Promise<{ id: string; title: string }[]>;
}
