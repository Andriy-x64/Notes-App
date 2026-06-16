/**
 * Інтерфейс провайдера повнотекстового пошуку.
 * Задає контракт для індексації та пошуку нотаток у базі даних.
 */
export interface SearchResult {
  id: string;
  type: "folder" | "note";
  title: string;
  snippet?: string;
  parentId: string | null;
}

export interface SearchProvider {
  search(
    query: string,
    scope: "global" | "folders_root" | "specific_folder",
    targetFolderId?: string
  ): Promise<SearchResult[]>;
}
