/**
 * Репозиторій налаштувань сортування.
 * Забезпечує збереження та отримання глобального способу сортування,
 * а також індивідуальних налаштувань сортування для окремих папок.
 */
import type { SortOption } from "@/core/types/sorting";
import { getDatabase } from "@/infrastructure/database/database-client";

const GLOBAL_SORT_KEY = "global_sort_setting";
const DEFAULT_SORT_OPTION: SortOption = "updated_at_desc";

export const setGlobalSortSetting = async (
  option: SortOption,
): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    GLOBAL_SORT_KEY,
    option,
  );
};

export const getGlobalSortSetting = async (): Promise<SortOption> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?",
    GLOBAL_SORT_KEY,
  );
  return (row?.value as SortOption) || DEFAULT_SORT_OPTION;
};

export const setFolderSortSetting = async (
  folderId: string,
  option: SortOption | null,
): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    "UPDATE folders SET sort_setting = ? WHERE id = ?",
    option,
    folderId,
  );
};

export const getFolderSortSetting = async (
  folderId: string,
): Promise<SortOption | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{ sort_setting: string | null }>(
    "SELECT sort_setting FROM folders WHERE id = ?",
    folderId,
  );
  return (row?.sort_setting as SortOption | null) ?? null;
};

export const resolveSortOptionForFolder = async (
  folderId: string | null,
): Promise<SortOption> => {
  if (folderId === null) {
    return await getGlobalSortSetting();
  }
  const folderSetting = await getFolderSortSetting(folderId);
  return folderSetting ?? (await getGlobalSortSetting());
};
