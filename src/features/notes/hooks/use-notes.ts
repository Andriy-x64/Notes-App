/**
 * Хук для завантаження списку нотаток конкретної папки.
 * Дозволяє отримувати список нотаток з урахуванням сортування та оновлювати його при фокусуванні.
 */
import { useCallback, useEffect, useState } from "react";

import * as noteService from "@/features/notes/services/note-service";
import type { Note } from "@/features/notes/types/note";
import { useNotesStore } from "@/features/notes/store/notes-store";
import { useSortStore } from "@/features/sorting/store/sort-store";

export const useNotes = (folderId: string | null = null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const moveRefreshToken = useNotesStore((state) => state.refreshToken);
  const refreshToken = useSortStore((state) => state.refreshToken);

  const loadNotes = useCallback(async () => {
    const nextNotes = await noteService.getNotes(folderId);
    setNotes(nextNotes);
  }, [folderId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes, moveRefreshToken, refreshToken]);

  return {
    notes,
    reloadNotes: loadNotes,
  };
};
