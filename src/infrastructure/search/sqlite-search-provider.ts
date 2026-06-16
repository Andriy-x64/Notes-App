/**
 * Реалізація провайдера повнотекстового пошуку на базі SQLite FTS5.
 *  Виконує пошук нотаток і папок; оновлення пошукового індексу відбувається в репозиторії нотаток.
 */
import type {
  SearchProvider,
  SearchResult,
} from "@/core/contracts/search-provider.interface";
import { normalizeFtsQuery } from "@/features/search/utils/normalize-fts-query";
import { normalizeLikeQuery } from "@/features/search/utils/normalize-like-query";
import { getDatabase } from "@/infrastructure/database/database-client";

interface SearchResultRow {
  id: string;
  type: "folder" | "note";
  title: string;
  snippet: string | null;
  parentId: string | null;
}

export class SqliteSearchProvider implements SearchProvider {
  private async hasNoteColumn(
    database: Awaited<ReturnType<typeof getDatabase>>,
    columnName: string,
  ): Promise<boolean> {
    const row = await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM pragma_table_info('notes') WHERE name = ?",
      columnName,
    );
    return (row?.count ?? 0) > 0;
  }

  private async getUnlockedNoteFilter(
    database: Awaited<ReturnType<typeof getDatabase>>,
  ): Promise<string> {
    if (await this.hasNoteColumn(database, "is_locked")) {
      return "AND COALESCE(n.is_locked, 0) = 0";
    }
    if (await this.hasNoteColumn(database, "locked")) {
      return "AND COALESCE(n.locked, 0) = 0";
    }
    return "";
  }

  async search(
    query: string,
    scope: "global" | "folders_root" | "specific_folder",
    targetFolderId?: string,
  ): Promise<SearchResult[]> {
    const likeQuery = normalizeLikeQuery(query);
    const ftsQuery = normalizeFtsQuery(query);

    if (!likeQuery && !ftsQuery) {
      return [];
    }

    if (scope === "specific_folder" && !targetFolderId) {
      return [];
    }

    const database = await getDatabase();
    const likePattern = `%${likeQuery}%`;
    const unlockedNoteFilter = await this.getUnlockedNoteFilter(database);

    const withRecursiveSql =
      scope === "specific_folder"
        ? `
          WITH RECURSIVE folder_tree AS (
            SELECT id
            FROM folders
            WHERE id = ?

            UNION ALL

            SELECT f.id
            FROM folders f
            INNER JOIN folder_tree ft
              ON f.parent_folder_id = ft.id
          )
        `
        : "";

    const folderScopeFilter =
      scope === "specific_folder"
        ? "AND f.id IN (SELECT id FROM folder_tree)"
        : "";

    const noteScopeFilter =
      scope === "folders_root"
        ? "AND n.folder_id IS NOT NULL"
        : scope === "specific_folder"
          ? "AND n.folder_id IN (SELECT id FROM folder_tree)"
          : "";

    const noteSearchSql = ftsQuery
      ? `
        SELECT
          n.id,
          'note' AS type,
          n.title,
          snippet(notes_fts, 2, '<b>', '</b>', '...', 15) AS snippet,
          n.folder_id AS parentId
        FROM notes_fts
        INNER JOIN notes n
          ON n.id = notes_fts.id
        WHERE notes_fts MATCH ?
          ${unlockedNoteFilter}
          ${noteScopeFilter}
      `
      : `
        SELECT
          NULL AS id,
          'note' AS type,
          NULL AS title,
          NULL AS snippet,
          NULL AS parentId
        WHERE 0
      `;

    const sql = `
      ${withRecursiveSql}
      SELECT
        id,
        type,
        title,
        snippet,
        parentId
      FROM (
        SELECT
          f.id,
          'folder' AS type,
          f.title,
          NULL AS snippet,
          f.parent_folder_id AS parentId
        FROM folders f
        WHERE f.title LIKE ? ESCAPE '\\'
          ${folderScopeFilter}

        UNION ALL

        ${noteSearchSql}
      ) search_results
      ORDER BY
        CASE
          WHEN LOWER(title) = LOWER(?) THEN 1
          WHEN LOWER(title) LIKE LOWER(? || '%') THEN 2
          ELSE 3
        END,
        title
      LIMIT 100
    `;

    const params: string[] =
      scope === "specific_folder"
        ? [
            targetFolderId ?? "",
            likePattern,
            ...(ftsQuery ? [ftsQuery] : []),
            query.trim(),
            query.trim(),
          ]
        : [
            likePattern,
            ...(ftsQuery ? [ftsQuery] : []),
            query.trim(),
            query.trim(),
          ];

    const rows = await database.getAllAsync<SearchResultRow>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      snippet: row.snippet ?? undefined,
      parentId: row.parentId,
    }));
  }
}
