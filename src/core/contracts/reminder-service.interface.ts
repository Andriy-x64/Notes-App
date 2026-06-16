/**
 * Інтерфейс сервісу керування нагадуваннями.
 * Визначає бізнес-методи для створення нагадувань та синхронізації їх з системними сповіщеннями.
 */
export interface ReminderService {
  cancelReminder(noteId: string): Promise<void>;
  syncReminderTitle(noteId: string, newTitle: string): Promise<void>;
  getReminderForNote(
    noteId: string
  ): Promise<{
    triggerAt: number;
    titleSnapshot: string;
    notificationId: string;
    isCompleted: number;
  } | null>;
}
