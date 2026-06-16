/**
 * Опис типу даних для сутності нагадування.
 * Визначає структуру об'єкта Reminder із міткою часу, ідентифікатором сповіщення та посиланням на нотатку.
 */
export interface ReminderDbItem {
  id: string;
  note_id: string;
  trigger_at: number;
  is_completed: number;
  title_snapshot: string;
  notification_id: string;
  created_at: number;
  updated_at: number;
  note_title: string | null;
  note_content: string | null;
}
