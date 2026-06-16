/**
 * Опис типу даних для сутності папки.
 * Визначає структуру об'єкта Folder, що використовується в базі даних та інтерфейсі.
 */
import type { SortOption } from "./sorting";

export interface Folder {
  id: string;
  title: string;
  createdAt: number;
  parentId: string | null;
  sortOrder: number;
  sortSetting: SortOption | null;
}
