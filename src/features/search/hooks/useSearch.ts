/**
 * Хук виконання пошуку нотаток та папок з дебаунсингом.
 * Керує введенням запиту користувачем, затримкою пошуку та отриманням результатів із репозиторію.
 */
import { useEffect, useRef, useState } from "react";

import { executeSearch } from "@/features/search/services/search-repository";
import type { SearchResultItem } from "@/features/search/types/search-result";
import type {
  SearchScope,
  SearchState,
} from "@/features/search/types/search-state";

const SEARCH_DEBOUNCE_MS = 50; // Час в мілісекундах після останнього введеного символу.

export const useSearch = (
  scope: SearchScope,
  targetFolderId?: string,
): SearchState => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);
  const trimmedQuery = query.trim();

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => {
      executeSearch(trimmedQuery, scope, targetFolderId)
        .then((nextResults) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          setResults(nextResults);
        })
        .catch((nextError: unknown) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          setError(
            nextError instanceof Error ? nextError : new Error("Search failed"),
          );
          setResults([]);
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          setIsLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [scope, targetFolderId, trimmedQuery]);

  return {
    error,
    hasQuery: trimmedQuery.length > 0,
    isLoading,
    query,
    results,
    setQuery,
  };
};
