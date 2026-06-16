/**
 * Хук для завантаження повного плоского списку всіх папок.
 * Автоматично оновлює список при зміні даних папок або налаштувань сортування.
 */
import { useCallback, useEffect, useState } from "react";

import * as folderService from "@/features/folders/services/folder-service";
import type { Folder } from "@/features/folders/types/folder";
import { useFoldersStore } from "@/features/folders/store/folders-store";
import { useSortStore } from "@/features/sorting/store/sort-store";

export const useAllFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const moveRefreshToken = useFoldersStore((state) => state.refreshToken);
  const sortRefreshToken = useSortStore((state) => state.refreshToken);

  const reloadFolders = useCallback(async () => {
    setIsLoading(true);

    try {
      const nextFolders = await folderService.getAllFolders();
      setFolders(nextFolders);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadFolders();
  }, [moveRefreshToken, reloadFolders, sortRefreshToken]);

  return {
    folders,
    isLoading,
    reloadFolders,
  };
};
