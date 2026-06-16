/**
 * Хук для читання та збереження налаштувань сортування.
 * Читає глобальне та per-folder сортування з settingsRepository, синхронізує store
 * та надає методи для зміни глобального або папочного сортування з персистентним збереженням.
 */
import * as settingsRepository from "@/core/settings/settings-repository";
import type { SortOption } from "@/core/types/sorting";
import { useSortStore } from "@/features/sorting/store/sort-store";
import { useCallback, useEffect, useState } from "react";

export const useSort = (folderId: string | null = null) => {
  const [sortOption, setSortOptionState] =
    useState<SortOption>("updated_at_desc");
  const [folderSortSetting, setFolderSortSettingState] =
    useState<SortOption | null>(null);

  const storeSetSortOption = useSortStore((state) => state.setSortOption);
  const triggerRefresh = useSortStore((state) => state.triggerRefresh);
  const refreshToken = useSortStore((state) => state.refreshToken);

  const loadSortSettings = useCallback(async () => {
    const globalSort = await settingsRepository.getGlobalSortSetting();
    storeSetSortOption(globalSort);

    if (folderId !== null) {
      const fSort = await settingsRepository.getFolderSortSetting(folderId);
      setFolderSortSettingState(fSort);
      const resolved =
        await settingsRepository.resolveSortOptionForFolder(folderId);
      setSortOptionState(resolved);
    } else {
      setSortOptionState(globalSort);
      setFolderSortSettingState(null);
    }
  }, [folderId, storeSetSortOption]);

  const updateGlobalSort = useCallback(
    async (option: SortOption | null) => {
      if (option === null) {
        return;
      }

      await settingsRepository.setGlobalSortSetting(option);
      storeSetSortOption(option);
      triggerRefresh();
    },
    [storeSetSortOption, triggerRefresh],
  );

  const updateFolderSort = useCallback(
    async (option: SortOption | null) => {
      if (folderId !== null) {
        await settingsRepository.setFolderSortSetting(folderId, option);
        triggerRefresh();
      }
    },
    [folderId, triggerRefresh],
  );

  useEffect(() => {
    loadSortSettings();
  }, [loadSortSettings, refreshToken]);

  return {
    sortOption,
    folderSortSetting,
    updateGlobalSort,
    updateFolderSort,
    refreshSort: loadSortSettings,
  };
};
