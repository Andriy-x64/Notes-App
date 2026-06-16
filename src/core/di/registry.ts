/**
 * Глобальний реєстр контейнера Dependency Injection.
 * Зберігає інстанси сервісів та надає зручні геттери для доступу до репозиторіїв і сервісів.
 */
import type { NotesRepository } from "../contracts/notes-repository.interface";
import type { FoldersRepository } from "../contracts/folders-repository.interface";
import type { RemindersRepository } from "../contracts/reminders-repository.interface";
import type { NotificationService } from "../contracts/notification-service.interface";
import type { ReminderService } from "../contracts/reminder-service.interface";
import type { SearchProvider } from "../contracts/search-provider.interface";

let notesRepository: NotesRepository | null = null;
let foldersRepository: FoldersRepository | null = null;
let remindersRepository: RemindersRepository | null = null;
let notificationService: NotificationService | null = null;
let reminderService: ReminderService | null = null;
const searchProviders: SearchProvider[] = [];

export const registerNotesRepository = (repo: NotesRepository) => {
  notesRepository = repo;
};
export const getNotesRepository = (): NotesRepository => {
  if (!notesRepository) throw new Error("NotesRepository not registered");
  return notesRepository;
};

export const registerFoldersRepository = (repo: FoldersRepository) => {
  foldersRepository = repo;
};
export const getFoldersRepository = (): FoldersRepository => {
  if (!foldersRepository) throw new Error("FoldersRepository not registered");
  return foldersRepository;
};

export const registerRemindersRepository = (repo: RemindersRepository) => {
  remindersRepository = repo;
};
export const getRemindersRepository = (): RemindersRepository => {
  if (!remindersRepository) throw new Error("RemindersRepository not registered");
  return remindersRepository;
};

export const registerNotificationService = (service: NotificationService) => {
  notificationService = service;
};
export const getNotificationService = (): NotificationService => {
  if (!notificationService) throw new Error("NotificationService not registered");
  return notificationService;
};

export const registerReminderService = (service: ReminderService) => {
  reminderService = service;
};
export const getReminderService = (): ReminderService => {
  if (!reminderService) throw new Error("ReminderService not registered");
  return reminderService;
};

export const registerSearchProvider = (provider: SearchProvider) => {
  searchProviders.push(provider);
};
export const getSearchProviders = (): SearchProvider[] => {
  return searchProviders;
};
export const clearSearchProviders = () => {
  searchProviders.length = 0;
};
