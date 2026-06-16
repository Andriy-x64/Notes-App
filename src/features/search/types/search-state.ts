/**
 * Опис стану пошуку.
 * Визначає структуру даних для збереження поточного запиту, результатів та стану завантаження пошуку.
 */
import type { SearchResultItem } from "@/features/search/types/search-result";

export type SearchScope = "global" | "folders_root" | "specific_folder";

export interface SearchState {
  error: Error | null;
  hasQuery: boolean;
  isLoading: boolean;
  query: string;
  results: SearchResultItem[];
  setQuery: (query: string) => void;
}
