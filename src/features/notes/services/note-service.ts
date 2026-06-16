/**
 * Сервіс бізнес-логіки для управління нотатками.
 * Надає функції створення, оновлення, автозбереження чернеток та видалення нотаток разом з їхніми нагадуваннями.
 */
import {
  getFoldersRepository,
  getNotesRepository,
  getReminderService,
} from "@/core/di/registry";
import type { Note } from "@/core/types/note";
import { getDatabase } from "@/infrastructure/database/database-client";
import { stripHtml } from "@/shared/utils/strip-html";

const generateNoteId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const hasMeaningfulContent = (title: string, content: string) => {
  return title.trim().length > 0 || stripHtml(content).trim().length > 0;
};

/**
 * Отримує список нотаток для вказаної папки (або без папки, якщо null) з урахуванням сортування.
 */
export const getNotes = async (folderId: string | null): Promise<Note[]> => {
  return getNotesRepository().getNotes(folderId);
};

/**
 * Отримує нотатку за її унікальним ідентифікатором.
 */
export const getNote = async (id: string): Promise<Note | undefined> => {
  return getNotesRepository().getNote(id);
};

/**
 * Зберігає чернетку нотатки: створює нову нотатку або оновлює існуючу.
 */
export const saveNoteDraft = async (
  title: string,
  content: string,
  folderId: string | null,
  noteId?: string | null,
): Promise<string | null> => {
  const activeNoteId = noteId && noteId !== "new" ? noteId : null;
  const meaningfulContent = hasMeaningfulContent(title, content);

  if (!activeNoteId) {
    if (!meaningfulContent) {
      return null;
    }

    return addNote(title, content, folderId);
  }

  // Зберігаємо зміни у базу даних для існуючої нотатки
  await updateNote(activeNoteId, title, content);
  return activeNoteId;
};

/**
 * Завершує роботу над чернеткою нотатки при виході з редактора: видаляє пусті чернетки або зберігає зміни.
 */
export const finalizeNoteDraftOnExit = async (
  title: string,
  content: string,
  folderId: string | null,
  noteId: string | null | undefined,
  wasCreatedInCurrentSession: boolean,
): Promise<{ noteId: string | null; deleted: boolean }> => {
  const activeNoteId = noteId && noteId !== "new" ? noteId : null;
  const meaningfulContent = hasMeaningfulContent(title, content);

  if (!activeNoteId) {
    if (!meaningfulContent) {
      return { noteId: null, deleted: false };
    }

    const createdId = await saveNoteDraft(title, content, folderId, null);
    return { noteId: createdId, deleted: false };
  }

  if (wasCreatedInCurrentSession && !meaningfulContent) {
    await deleteNote(activeNoteId);
    return { noteId: null, deleted: true };
  }

  await saveNoteDraft(title, content, folderId, activeNoteId);
  return { noteId: activeNoteId, deleted: false };
};

/**
 * Створює нову нотатку в базі даних та її індекс повнотекстового пошуку FTS.
 */
export const addNote = async (
  title: string,
  content: string,
  folderId: string | null,
): Promise<string> => {
  const database = await getDatabase();
  const id = generateNoteId();
  await database.withTransactionAsync(async () => {
    await getNotesRepository().addNote(
      id,
      title,
      content,
      folderId,
      Date.now(),
    );
  });
  return id;
};

/**
 * Оновлює заголовок, вміст та індекси пошуку для існуючої нотатки.
 */
export const updateNote = async (
  id: string,
  title: string,
  content: string,
): Promise<void> => {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await getNotesRepository().updateNote(id, title, content);
  });
  await getReminderService().syncReminderTitle(id, title);
};

/**
 * Видаляє нотатку, скасовує пов'язане нагадування та очищає записи пошукового індексу FTS.
 */
export const deleteNote = async (noteId: string): Promise<void> => {
  const database = await getDatabase();
  await getReminderService().cancelReminder(noteId);
  await database.withTransactionAsync(async () => {
    await getNotesRepository().deleteNote(noteId);
  });
};

/**
 * Масово видаляє нотатки за списком ідентифікаторів
 * та попередньо скасовує пов'язані з ними нагадування.
 */
export const deleteNotes = async (ids: string[]): Promise<void> => {
  const database = await getDatabase();
  const uniqueIds = Array.from(new Set(ids));
  if (uniqueIds.length === 0) return;

  for (const id of uniqueIds) {
    await getReminderService().cancelReminder(id);
  }

  await database.withTransactionAsync(async () => {
    for (const id of uniqueIds) {
      await getNotesRepository().deleteNote(id);
    }
  });
};

/**
 * Закріплює або відкріплює список нотаток.
 */
export const togglePinNotes = async (
  ids: string[],
  pin: boolean,
): Promise<void> => {
  const database = await getDatabase();
  await database.withTransactionAsync(async () => {
    await getNotesRepository().togglePinNotes(ids, pin);
  });
};

/**
 * Переміщує вибрані нотатки у вказану цільову папку (або в корінь при targetFolderId = null).
 */
export const moveNotes = async (
  noteIds: string[],
  targetFolderId: string | null,
): Promise<void> => {
  const uniqueNoteIds = Array.from(new Set(noteIds));
  if (uniqueNoteIds.length === 0) {
    return;
  }

  if (targetFolderId !== null) {
    const targetFolder =
      await getFoldersRepository().getFolderById(targetFolderId);
    if (!targetFolder) {
      throw new Error("Target folder not found");
    }
  }

  const notes = await Promise.all(
    uniqueNoteIds.map((noteId) => getNotesRepository().getNote(noteId)),
  );
  if (notes.some((note) => !note)) {
    throw new Error("Note not found");
  }

  await getNotesRepository().moveNotes(uniqueNoteIds, targetFolderId);
};
