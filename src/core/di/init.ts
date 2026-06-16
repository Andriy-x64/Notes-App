/**
 * Модуль ініціалізації Dependency Injection (впровадження залежностей).
 * Реєструє конкретні інфраструктурні реалізації сервісів та репозиторіїв у глобальному контейнері DI.
 */
import {
  registerNotesRepository,
  registerFoldersRepository,
  registerRemindersRepository,
  registerNotificationService,
  registerReminderService,
  registerSearchProvider,
} from "./registry";
import { SqliteNotesRepository } from "@/infrastructure/database/repositories/sqlite-notes-repository";
import { SqliteFoldersRepository } from "@/infrastructure/database/repositories/sqlite-folders-repository";
import { SqliteRemindersRepository } from "@/infrastructure/database/repositories/sqlite-reminders-repository";
import { ExpoNotificationService } from "@/infrastructure/notifications/expo-notification-service";
import { ReminderServiceImpl } from "@/features/reminders/services/reminder-service";
import { SqliteSearchProvider } from "@/infrastructure/search/sqlite-search-provider";

export const initializeDI = () => {
  const notesRepo = new SqliteNotesRepository();
  const foldersRepo = new SqliteFoldersRepository();
  const remindersRepo = new SqliteRemindersRepository();
  const notificationService = new ExpoNotificationService();
  const reminderService = new ReminderServiceImpl();
  const searchProvider = new SqliteSearchProvider();

  registerNotesRepository(notesRepo);
  registerFoldersRepository(foldersRepo);
  registerRemindersRepository(remindersRepo);
  registerNotificationService(notificationService);
  registerReminderService(reminderService);
  registerSearchProvider(searchProvider);
};
