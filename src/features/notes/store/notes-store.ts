/**
 * Глобальне сховище стану нотаток (Zustand).
 * Використовується для синхронізації дій над нотатками (наприклад, масового переміщення) між компонентами.
 */
import * as noteService from "@/features/notes/services/note-service";
import { create } from "zustand";

interface NotesState {
  /*Токен оновлення стану для реактивної синхронізації списків нотаток на UI.*/
  refreshToken: number;
  //Тригерить оновлення токена та змушує компоненти перечитати список нотаток.
  triggerRefresh: () => void;
  // Екшен масового переміщення списку нотаток в іншу папку.
  moveNotes: (
    noteIds: string[],
    targetFolderId: string | null,
  ) => Promise<void>;
}

//Глобальний React-хук доступу до сховища Zustand для управління станом нотаток.
export const useNotesStore = create<NotesState>((set) => ({
  refreshToken: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshToken: state.refreshToken + 1 })),
  moveNotes: async (noteIds, targetFolderId) => {
    await noteService.moveNotes(noteIds, targetFolderId);
    set((state) => ({ refreshToken: state.refreshToken + 1 }));
  },
}));
