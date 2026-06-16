/**
 * Сервіс бізнес-логіки для роботи з папками.
 * Містить функції для взаємодії з репозиторієм папок, включаючи видалення ієрархії, переміщення та зміну порядку.
 */
import { getDatabase } from "@/infrastructure/database/database-client";
import { getFoldersRepository, getReminderService } from "@/core/di/registry";
import type { Folder } from "@/core/types/folder";

const generateFolderId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const getUniqueIds = (ids: string[]) => Array.from(new Set(ids));

const buildChildrenMap = (folders: Folder[]) => {
  const childrenMap = new Map<string | null, Folder[]>();

  for (const folder of folders) {
    const parentKey = folder.parentId;
    const existingChildren = childrenMap.get(parentKey) ?? [];
    existingChildren.push(folder);
    childrenMap.set(parentKey, existingChildren);
  }

  return childrenMap;
};

const collectDescendants = (folders: Folder[], rootIds: string[]) => {
  const childrenMap = buildChildrenMap(folders);
  const descendants = new Set<string>();
  const queue = [...rootIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = childrenMap.get(currentId) ?? [];
    for (const child of children) {
      if (descendants.has(child.id)) {
        continue;
      }

      descendants.add(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
};

const validateFolderMoveTarget = async (
  folderIds: string[],
  targetFolderId: string | null
): Promise<{ folders: Folder[]; targetFolder: Folder | undefined }> => {
  const uniqueFolderIds = getUniqueIds(folderIds);
  if (uniqueFolderIds.length === 0) {
    return { folders: [], targetFolder: undefined };
  }

  const folders = await getFoldersRepository().getAllFolders();
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));

  for (const folderId of uniqueFolderIds) {
    if (!folderMap.has(folderId)) {
      throw new Error("Folder not found");
    }
  }

  if (targetFolderId === null) {
    return { folders, targetFolder: undefined };
  }

  const targetFolder = folderMap.get(targetFolderId);
  if (!targetFolder) {
    throw new Error("Target folder not found");
  }

  const descendantIds = collectDescendants(folders, uniqueFolderIds);
  if (descendantIds.has(targetFolderId) || uniqueFolderIds.includes(targetFolderId)) {
    throw new Error("Cannot move folder into itself or its descendants");
  }

  return { folders, targetFolder };
};

/**
 * Отримує список папок конкретного рівня ієрархії (дочірні папки для parentId).
 */
export const getFolders = async (parentId: string | null = null): Promise<Folder[]> => {
  return getFoldersRepository().getFolders(parentId);
};

/**
 * Отримує повний плоский список всіх папок, наявних у системі.
 */
export const getAllFolders = async (): Promise<Folder[]> => {
  return getFoldersRepository().getAllFolders();
};

/**
 * Знаходить та повертає папку за її унікальним ідентифікатором.
 */
export const getFolder = async (id: string): Promise<Folder | undefined> => {
  return getFoldersRepository().getFolderById(id);
};

/**
 * Створює нову папку у вказаній батьківській директорії з генерацією унікального ID.
 */
export const createFolder = async (
  title: string,
  parentId: string | null = null
): Promise<string> => {
  const id = generateFolderId();
  const sortOrder = await getFoldersRepository().getFolderMinSortOrder(parentId);
  await getFoldersRepository().createFolder(id, title, sortOrder, parentId, Date.now());
  return id;
};

/**
 * Змінює назву папки з попередньою валідацією назви на порожнє значення.
 */
export const renameFolder = async (
  folderId: string,
  newName: string
): Promise<void> => {
  const safeName = newName.trim();
  if (!safeName) {
    throw new Error("Назва папки не може бути порожньою");
  }

  const folder = await getFoldersRepository().getFolderById(folderId);
  if (!folder) {
    throw new Error("Folder not found");
  }

  if (folder.title.trim() === safeName) {
    return;
  }

  await getFoldersRepository().renameFolder(folderId, safeName);
};

/**
 * Масово переміщує декілька папок у вказану цільову папку з перевіркою ієрархії.
 */
export const moveFolders = async (
  folderIds: string[],
  targetFolderId: string | null
): Promise<void> => {
  const uniqueFolderIds = getUniqueIds(folderIds);
  if (uniqueFolderIds.length === 0) {
    return;
  }

  const { folders } = await validateFolderMoveTarget(uniqueFolderIds, targetFolderId);
  const currentFolderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const folderIdsToMove = uniqueFolderIds.filter((folderId) => {
    const currentFolder = currentFolderMap.get(folderId);
    return currentFolder ? currentFolder.parentId !== targetFolderId : true;
  });

  if (folderIdsToMove.length === 0) {
    return;
  }

  await getFoldersRepository().moveFolders(folderIdsToMove, targetFolderId);
};

/**
 * Переміщує одну папку у вказану цільову папку (обгортка над moveFolders).
 */
export const moveFolder = async (
  folderId: string,
  targetFolderId: string | null
): Promise<void> => {
  await moveFolders([folderId], targetFolderId);
};

/**
 * Видаляє папку та всю її ієрархію (дочірні папки, нотатки та пов'язані з ними нагадування).
 */
export const deleteFolder = async (id: string): Promise<void> => {
  const database = await getDatabase();
  const folderIds = await getFoldersRepository().getFolderTreeIds(id);

  // Спочатку скасовуємо всі системні нагадування для нотаток у цих папках
  const notes = await getFoldersRepository().getNotesInFolders(folderIds);
  for (const note of notes) {
    await getReminderService().cancelReminder(note.id);
  }

  await database.withTransactionAsync(async () => {
    await getFoldersRepository().deleteNotesInFolders(folderIds);
    await getFoldersRepository().deleteFoldersRecords(folderIds);
  });
};

/**
 * Масово видаляє декілька папок разом з їхніми деревами дочірніх папок, нотатками та нагадуваннями.
 */
export const deleteFolders = async (ids: string[]): Promise<void> => {
  const database = await getDatabase();
  const uniqueIds = Array.from(new Set(ids));

  for (const id of uniqueIds) {
    const folderIds = await getFoldersRepository().getFolderTreeIds(id);
    const notes = await getFoldersRepository().getNotesInFolders(folderIds);
    for (const note of notes) {
      await getReminderService().cancelReminder(note.id);
    }

    await database.withTransactionAsync(async () => {
      await getFoldersRepository().deleteNotesInFolders(folderIds);
      await getFoldersRepository().deleteFoldersRecords(folderIds);
    });
  }
};

/**
 * Оновлює порядок відображення (sort_order) для списку папок у базі даних SQLite.
 */
export const updateFoldersOrder = async (folders: Folder[]): Promise<void> => {
  const database = await getDatabase();
  await database.withExclusiveTransactionAsync(async (txn) => {
    for (const [index, folder] of folders.entries()) {
      await txn.runAsync(
        "UPDATE folders SET sort_order = ? WHERE id = ?",
        index,
        folder.id
      );
    }
  });
};
