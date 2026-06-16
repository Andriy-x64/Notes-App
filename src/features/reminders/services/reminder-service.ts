/**
 * Сервіс бізнес-логіки нагадувань додатка.
 * Інтегрує роботу з базою даних нагадувань та системним сервісом сповіщень для планування та скасування нотифікацій.
 */
import type { ReminderService } from "@/core/contracts/reminder-service.interface";
import {
  getNotesRepository,
  getNotificationService,
  getRemindersRepository,
} from "@/core/di/registry";
import type { ReminderDbItem } from "@/core/types/reminder";
import { getDatabase } from "@/infrastructure/database/database-client";

const generateId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ─── Реалізація ReminderService (використовується через впровадження залежностей (DI) іншими функціями) ───────────

/**
 * Реалізація сервісу нагадувань для використання через механізм Dependency Injection.
 */
export class ReminderServiceImpl implements ReminderService {
  /**
   * Скасовує заплановане нагадування для нотатки (видаляє з БД та ОС).
   */
  async cancelReminder(noteId: string): Promise<void> {
    const row = await getRemindersRepository().getReminderForNote(noteId);
    if (row) {
      if (row.notificationId) {
        try {
          await getNotificationService().cancelOSNotification(
            row.notificationId,
          );
        } catch (e) {
          console.warn("Failed to cancel notification in OS:", e);
        }
      }
      await getRemindersRepository().deleteReminderRecord(noteId);
    }
  }

  /**
   * Синхронізує заголовок сповіщення в ОС, якщо змінився заголовок нотатки.
   */
  async syncReminderTitle(noteId: string, newTitle: string): Promise<void> {
    const reminder = await getRemindersRepository().getReminderForNote(noteId);
    if (!reminder || reminder.isCompleted === 1) return;

    if (reminder.titleSnapshot !== newTitle) {
      const now = Date.now();
      if (reminder.triggerAt <= now) return;

      const contentPlain =
        await getNotesRepository().getNoteContentPlain(noteId);
      const isLocked = await getNotesRepository().getNoteLockStatus(noteId);

      if (reminder.notificationId) {
        try {
          await getNotificationService().cancelOSNotification(
            reminder.notificationId,
          );
        } catch (e) {
          console.warn(
            "Failed to cancel OS notification during title sync:",
            e,
          );
        }
      }

      await getNotificationService().ensureAndroidNotificationChannel();

      const notificationBody = isLocked
        ? "🔒 Вміст нотатки заблоковано"
        : contentPlain;
      const newNotificationId =
        await getNotificationService().scheduleOSNotification(
          newTitle,
          notificationBody,
          reminder.triggerAt,
          { noteId },
        );

      await getRemindersRepository().updateReminder(
        noteId,
        reminder.triggerAt,
        newTitle,
        newNotificationId,
        now,
      );
    }
  }

  /**
   * Отримує нагадування для вказаної нотатки.
   */
  async getReminderForNote(noteId: string) {
    return getRemindersRepository().getReminderForNote(noteId);
  }
}

// ─── Функції рівня модуля (для безпосереднього використання в екранах/сервісах нагадувань) ─────

/**
 * Запитує системний дозвіл на надсилання локальних сповіщень.
 */
export const requestPermissions = async (): Promise<boolean> => {
  return getNotificationService().requestNotificationPermissions();
};

/**
 * Створює канал сповіщень для Android пристроїв.
 */
export const ensureAndroidChannel = async (): Promise<void> => {
  await getNotificationService().ensureAndroidNotificationChannel();
};

/**
 * Планує нагадування:
 * створює системне сповіщення та синхронізує відповідний запис у базі даних.
 */
export const scheduleReminder = async (
  noteId: string,
  title: string,
  bodyPlain: string,
  triggerAt: number,
): Promise<void> => {
  if (triggerAt <= Date.now()) {
    throw new Error("Reminder time must be in the future");
  }

  await cancelReminder(noteId);

  const hasPermission =
    await getNotificationService().requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error("Notification permission denied");
  }
  await getNotificationService().ensureAndroidNotificationChannel();

  const isLocked = await getNotesRepository().getNoteLockStatus(noteId);
  const notificationBody = isLocked
    ? "🔒 Вміст нотатки заблоковано"
    : bodyPlain;

  const notificationId = await getNotificationService().scheduleOSNotification(
    title,
    notificationBody,
    triggerAt,
    { noteId },
  );

  try {
    const existing = await getRemindersRepository().getReminderForNote(noteId);
    const now = Date.now();
    if (existing) {
      await getRemindersRepository().updateReminder(
        noteId,
        triggerAt,
        title,
        notificationId,
        now,
      );
    } else {
      const reminderId = `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      await getRemindersRepository().createReminder(
        reminderId,
        noteId,
        triggerAt,
        title,
        notificationId,
        now,
        now,
      );
    }
  } catch (error) {
    try {
      await getNotificationService().cancelOSNotification(notificationId);
    } catch (e) {
      console.warn("Compensation failed:", e);
    }
    throw error;
  }
};

/**
 * Скасовує заплановане нагадування для нотатки (видаляє його з ОС та БД).
 */
export const cancelReminder = async (noteId: string): Promise<void> => {
  const row = await getRemindersRepository().getReminderForNote(noteId);
  if (row) {
    if (row.notificationId) {
      try {
        await getNotificationService().cancelOSNotification(row.notificationId);
      } catch (e) {
        console.warn("Failed to cancel notification in OS:", e);
      }
    }
    await getRemindersRepository().deleteReminderRecord(noteId);
  }
};

/**
 * Позначає нагадування як виконане,
 * скасовує відповідне системне сповіщення
 * та оновлює статус нагадування в базі даних.
 */
export const markReminderCompleted = async (noteId: string): Promise<void> => {
  const row = await getRemindersRepository().getReminderForNote(noteId);
  if (row?.notificationId) {
    try {
      await getNotificationService().cancelOSNotification(row.notificationId);
    } catch (e) {
      console.warn("Failed to cancel scheduled notification in OS:", e);
    }
  }
  await getRemindersRepository().toggleReminderStatus(noteId, true);
};

/**
 * Отримує нагадування для вказаної нотатки.
 */
export const getReminderForNote = async (
  noteId: string,
): Promise<{
  triggerAt: number;
  titleSnapshot: string;
  notificationId: string;
  isCompleted: number;
} | null> => {
  return getRemindersRepository().getReminderForNote(noteId);
};

/**
 * Синхронізує заголовок сповіщення в ОС, якщо змінився заголовок нотатки.
 */
export const syncReminderTitle = async (
  noteId: string,
  newTitle: string,
): Promise<void> => {
  const reminder = await getRemindersRepository().getReminderForNote(noteId);
  if (!reminder || reminder.isCompleted === 1) return;

  if (reminder.titleSnapshot !== newTitle) {
    const now = Date.now();
    if (reminder.triggerAt <= now) return;

    const contentPlain = await getNotesRepository().getNoteContentPlain(noteId);
    const isLocked = await getNotesRepository().getNoteLockStatus(noteId);

    if (reminder.notificationId) {
      try {
        await getNotificationService().cancelOSNotification(
          reminder.notificationId,
        );
      } catch (e) {
        console.warn("Failed to cancel OS notification during title sync:", e);
      }
    }

    await getNotificationService().ensureAndroidNotificationChannel();

    const notificationBody = isLocked
      ? "🔒 Вміст нотатки заблоковано"
      : contentPlain;
    const newNotificationId =
      await getNotificationService().scheduleOSNotification(
        newTitle,
        notificationBody,
        reminder.triggerAt,
        { noteId },
      );

    await getRemindersRepository().updateReminder(
      noteId,
      reminder.triggerAt,
      newTitle,
      newNotificationId,
      now,
    );
  }
};

/**
 * Переплановує активні нагадування в ОС при запуску додатка, якщо вони були скинуті.
 */
export const reconcileRemindersOnAppStart = async (): Promise<void> => {
  const now = Date.now();
  const activeReminders = await getRemindersRepository().getActiveReminders();
  const scheduledIds = new Set(
    await getNotificationService().getOSActiveScheduledNotifications(),
  );

  for (const reminder of activeReminders) {
    if (
      reminder.trigger_at > now &&
      !scheduledIds.has(reminder.notification_id)
    ) {
      try {
        const isLocked = await getNotesRepository().getNoteLockStatus(
          reminder.note_id,
        );
        const contentPlain = await getNotesRepository().getNoteContentPlain(
          reminder.note_id,
        );
        const notificationBody = isLocked
          ? "🔒 Вміст нотатки заблоковано"
          : contentPlain;

        await getNotificationService().ensureAndroidNotificationChannel();

        const newNotificationId =
          await getNotificationService().scheduleOSNotification(
            reminder.title_snapshot,
            notificationBody,
            reminder.trigger_at,
            { noteId: reminder.note_id },
          );

        await getRemindersRepository().updateReminder(
          reminder.note_id,
          reminder.trigger_at,
          reminder.title_snapshot,
          newNotificationId,
          Date.now(),
        );
      } catch (error) {
        console.warn(
          `Failed to reschedule reminder on start for note ${reminder.note_id}:`,
          error,
        );
      }
    }
  }
};

export interface ReminderItem {
  id: string;
  noteId: string;
  triggerAt: number;
  titleSnapshot: string;
  notificationId: string;
  createdAt: number;
  updatedAt: number;
  noteTitle: string | null;
  contentPlain: string | null;
  isCompleted: number;
}

/**
 * Отримує всі нагадування користувача з бази даних.
 */
export const getAllReminders = async (): Promise<ReminderItem[]> => {
  const list = await getRemindersRepository().getReminders("all");
  return list.map((row) => ({
    id: row.id,
    noteId: row.note_id,
    triggerAt: row.trigger_at,
    titleSnapshot: row.title_snapshot,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    noteTitle: row.note_title,
    contentPlain: row.note_content,
    isCompleted: row.is_completed,
  }));
};

/**
 * Отримує список нотаток, для яких ще немає нагадувань.
 */
export const getNotesWithoutReminders = async (): Promise<
  { id: string; title: string }[]
> => {
  return getRemindersRepository().getNotesWithoutReminders();
};

/**
 * Спочатку скасовує нагадування в ОС та БД,
 * після чого видаляє нотатку в транзакції бази даних.
 */
export const deleteReminderAndNote = async (noteId: string): Promise<void> => {
  const database = await getDatabase();
  await cancelReminder(noteId);
  await database.withTransactionAsync(async () => {
    await getNotesRepository().deleteNote(noteId);
  });
};

/**
 * Створює нотатку та пов'язаний запис нагадування в транзакції SQLite.
 * Після цього окремо планує системне сповіщення та записує його notificationId у БД.
 */
export const createReminderWithNote = async (
  title: string,
  description: string,
  triggerAt: number,
): Promise<{ noteId: string; reminderId: string }> => {
  if (triggerAt <= Date.now()) {
    throw new Error("Reminder time must be in the future");
  }

  const hasPermission =
    await getNotificationService().requestNotificationPermissions();
  if (!hasPermission) {
    throw new Error("Notification permission denied");
  }
  await getNotificationService().ensureAndroidNotificationChannel();

  const database = await getDatabase();
  const noteId = generateId();
  const reminderId = generateId();
  const now = Date.now();
  const htmlContent = `<p>${description}</p>`;

  await database.withTransactionAsync(async () => {
    await getNotesRepository().addNote(noteId, title, htmlContent, null, now);
    await getRemindersRepository().createReminder(
      reminderId,
      noteId,
      triggerAt,
      title,
      "",
      now,
      now,
    );
  });

  try {
    const notificationId =
      await getNotificationService().scheduleOSNotification(
        title,
        description || "Нагадування",
        triggerAt,
        { noteId },
      );
    await getRemindersRepository().setReminderNotification(
      noteId,
      notificationId,
    );
  } catch (error) {
    console.warn("OS notification scheduling failed after DB write:", error);
    throw error;
  }

  return { noteId, reminderId };
};

/**
 * Перемикає статус виконання нагадування.
 */
export const toggleReminderStatus = async (
  noteId: string,
  isCompleted: boolean,
): Promise<void> => {
  if (isCompleted) {
    await markReminderCompleted(noteId);
  } else {
    await getRemindersRepository().toggleReminderStatus(noteId, false);
  }
};

/**
 * Отримує список нагадувань за певним фільтром (all, completed, overdue, scheduled).
 */
export const getReminders = async (
  filter: "all" | "completed" | "overdue" | "scheduled",
): Promise<ReminderDbItem[]> => {
  return getRemindersRepository().getReminders(filter);
};

// Псевдоніми для зворотної сумісності
export const createReminder = scheduleReminder;
export const updateReminder = scheduleReminder;
export const deleteReminder = cancelReminder;
export const completeReminder = markReminderCompleted;
export const rescheduleReminder = scheduleReminder;
export const reconcileReminders = reconcileRemindersOnAppStart;
