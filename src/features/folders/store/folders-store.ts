/**
 * Глобальне сховище Zustand для синхронізації оновлень стану папок.
 * Керує токеном оновлення (refreshToken) та надає методи керування для реактивного перемалювання інтерфейсу.
 */
import * as folderService from "@/features/folders/services/folder-service";
import { create } from "zustand";

interface FoldersState {
  //Токен оновлення стану для реактивної синхронізації списків папок на UI.
  refreshToken: number;

  //Тригерить оновлення токена та змушує компоненти перечитати список папок.
  triggerRefresh: () => void;

  //Екшен зміни назви папки.
  renameFolder: (folderId: string, newName: string) => Promise<void>;

  /*Екшен переміщення однієї папки у нову батьківську папку.*/
  moveFolder: (
    folderId: string,
    targetFolderId: string | null,
  ) => Promise<void>;

  /* Екшен масового переміщення кількох папок у нову батьківську папку.*/
  moveFolders: (
    folderIds: string[],
    targetFolderId: string | null,
  ) => Promise<void>;
}

/*Глобальний React-хук доступу до сховища Zustand для управління станом папок.*/
export const useFoldersStore = create<FoldersState>((set) => ({
  refreshToken: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshToken: state.refreshToken + 1 })),
  renameFolder: async (folderId, newName) => {
    await folderService.renameFolder(folderId, newName);
    set((state) => ({ refreshToken: state.refreshToken + 1 }));
  },
  moveFolder: async (folderId, targetFolderId) => {
    await folderService.moveFolder(folderId, targetFolderId);
    set((state) => ({ refreshToken: state.refreshToken + 1 }));
  },
  moveFolders: async (folderIds, targetFolderId) => {
    await folderService.moveFolders(folderIds, targetFolderId);
    set((state) => ({ refreshToken: state.refreshToken + 1 }));
  },
}));
