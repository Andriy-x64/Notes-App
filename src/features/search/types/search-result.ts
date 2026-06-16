/**
 * Опис структури результату пошуку.
 * Визначає форму об'єкта знайденої нотатки, що передається на UI.
 */
export interface SearchResultItem {
  id: string;
  type: "folder" | "note";
  title: string;
  snippet?: string;
  parentId: string | null;
}
