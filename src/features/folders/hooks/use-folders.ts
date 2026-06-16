/**
 * Хук для роботи зі списком папок конкретного рівня.
 * Дозволяє отримувати та оновлювати папки, що знаходяться безпосередньо всередині обраної батьківської папки.
 */
import { InteractionManager } from "react-native";
import { useCallback, useEffect, useState } from "react";

import * as foldersRepository from "@/features/folders/services/folder-service";
import type { Folder } from "@/features/folders/types/folder";
import { useFoldersStore } from "@/features/folders/store/folders-store";
import { useSortStore } from "@/features/sorting/store/sort-store";

export const useFolders = (parentId: string | null = null) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const moveRefreshToken = useFoldersStore((state) => state.refreshToken);
  const refreshToken = useSortStore((state) => state.refreshToken);

  const reloadFolders = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextFolders = await foldersRepository.getFolders(parentId);
      setFolders(nextFolders);
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  const addFolder = useCallback(
    async (title: string) => {
      const safeTitle = title.trim();

      if (!safeTitle) {
        return undefined;
      }

      const id = await foldersRepository.createFolder(safeTitle, parentId);
      await reloadFolders();

      return id;
    },
    [parentId, reloadFolders]
  );

  const deleteFolders = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }

      await foldersRepository.deleteFolders(ids);
      await reloadFolders();
    },
    [reloadFolders]
  );

  const reorderFolders = useCallback((nextFolders: Folder[]) => {
    setFolders(nextFolders);
    InteractionManager.runAfterInteractions(() => {
      void foldersRepository.updateFoldersOrder(nextFolders);
    });
  }, []);

  useEffect(() => {
    reloadFolders();
  }, [reloadFolders, moveRefreshToken, refreshToken]);

  return {
    addFolder,
    deleteFolders,
    folders,
    isLoading,
    reloadFolders,
    reorderFolders,
  };
};
