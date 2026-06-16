/**
 * Утиліта нормалізації пошукового запиту для FTS SQLite.
 * Готує та екранує рядок пошуку для сумісності із синтаксисом повнотекстового пошуку SQLite FTS5.
 */
const RESERVED_FTS_OPERATORS = /\b(?:NEAR|OR|AND)\b/gi;

export const normalizeFtsQuery = (query: string) => {
  const normalizedQuery = query
    .replace(/[":*]/g, " ")
    .replace(RESERVED_FTS_OPERATORS, " ")
    .trim();
  const terms = normalizedQuery.match(/[\p{L}\p{N}_]+/gu) ?? [];

  return terms.map((term) => `${term}*`).join(" AND ");
};
