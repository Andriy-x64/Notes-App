/**
 * Інтерфейс репозиторію для роботи з папками.
 * Визначає контракт для збереження, оновлення, видалення та отримання папок у сховищі даних.
 */
import type { Folder } from "../types/folder";

export interface FoldersRepository {
  getFolders(parentId: string | null): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | undefined>;
  getFolderById(folderId: string): Promise<Folder | undefined>;
  getFolderChildren(folderId: string): Promise<Folder[]>;
  getAllFolders(): Promise<Folder[]>;
  getFolderMinSortOrder(parentId: string | null): Promise<number>;
  createFolder(
    id: string,
    title: string,
    sortOrder: number,
    parentId: string | null,
    createdAt: number
  ): Promise<void>;
  renameFolder(folderId: string, newName: string): Promise<void>;
  deleteFolderRecord(id: string): Promise<void>;
  updateFolderSortOrder(id: string, sortOrder: number): Promise<void>;
  updateParentFolder(folderId: string, parentFolderId: string | null): Promise<void>;
  moveFolders(folderIds: string[], parentFolderId: string | null): Promise<void>;
  getFolderTreeIds(rootId: string): Promise<string[]>;
  getNotesInFolders(folderIds: string[]): Promise<{ id: string }[]>;
  deleteNotesInFolders(folderIds: string[]): Promise<void>;
  deleteFoldersRecords(folderIds: string[]): Promise<void>;
}
