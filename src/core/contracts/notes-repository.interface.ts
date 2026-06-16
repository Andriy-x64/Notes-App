/**
 * Інтерфейс репозиторію для роботи з нотатками.
 * Визначає методи доступу до даних нотаток, включаючи створення, оновлення, видалення та фільтрацію.
 */
import type { Note } from "../types/note";

export interface NotesRepository {
  getNotes(folderId: string | null): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  addNote(
    id: string,
    title: string,
    content: string,
    folderId: string | null,
    createdAt: number
  ): Promise<void>;
  updateNote(id: string, title: string, content: string): Promise<void>;
  deleteNote(id: string): Promise<void>;
  togglePinNotes(ids: string[], pin: boolean): Promise<void>;
  moveNotes(noteIds: string[], targetFolderId: string | null): Promise<void>;
  getNoteLockStatus(noteId: string): Promise<boolean>;
  getNoteContentPlain(noteId: string): Promise<string>;
}
