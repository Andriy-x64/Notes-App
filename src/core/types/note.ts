/**
 * Опис типу даних для сутності нотатки.
 * Визначає структуру об'єкта Note, включаючи текстовий вміст, заголовок та прапорець закріплення.
 */
export interface Note {
  id: string;
  title: string;
  content: string;
  contentPlain: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned: boolean;
}
