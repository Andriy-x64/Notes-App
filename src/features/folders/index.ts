/**
 * Точка публічного експорту (public API) фічі папок.
 * Експортує типи, хуки та сервіси папок для використання в інших модулях додатка.
 */
export type { Folder } from "@/features/folders/types/folder";
export { FolderCard } from "@/features/folders/components/folder-card";
export { useFolders } from "@/features/folders/hooks/use-folders";
export { useAllFolders } from "@/features/folders/hooks/use-all-folders";
export {
  createFolder,
  deleteFolder,
  deleteFolders,
  getFolder,
  getAllFolders,
  getFolders,
  renameFolder,
  moveFolder,
  moveFolders,
  updateFoldersOrder,
} from "@/features/folders/services/folder-service";
