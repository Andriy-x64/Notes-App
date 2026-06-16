/**
 * Сервіс агрегації пошукових результатів.
 * Звертається до всіх зареєстрованих у DI провайдерів пошуку та повертає об'єднаний дедублікований список.
 */
import { getSearchProviders } from "@/core/di/registry";
import type { SearchResultItem } from "@/features/search/types/search-result";

type SearchScope = "global" | "folders_root" | "specific_folder";

/**
 * Виконує пошук нотаток та папок відповідно до заданого запиту та області пошуку (глобально, в корені або в конкретній папці).
 */
export const executeSearch = async (
  query: string,
  scope: SearchScope,
  targetFolderId?: string
): Promise<SearchResultItem[]> => {
  const providers = getSearchProviders();
  const resultsList = await Promise.all(
    providers.map((provider) => provider.search(query, scope, targetFolderId))
  );

  // Об'єднуємо та видаляємо дублікати/агрегуємо результати пошуку
  const allResults: SearchResultItem[] = [];
  const seenIds = new Set<string>();

  for (const results of resultsList) {
    for (const res of results) {
      const uniqueKey = `${res.type}:${res.id}`;
      if (!seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        allResults.push({
          id: res.id,
          type: res.type,
          title: res.title,
          snippet: res.snippet,
          parentId: res.parentId,
        });
      }
    }
  }

  return allResults;
};
