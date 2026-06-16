/**
 * Реалізація репозиторію папок на базі SQLite.
 * Здійснює безпосередні SQL-запити до бази даних для вибірки, вставки, оновлення та видалення папок.
 */
import { getDatabase } from "../database-client";
import type { FoldersRepository } from "@/core/contracts/folders-repository.interface";
import type { Folder } from "@/core/types/folder";
import type { SortOption } from "@/core/types/sorting";
import { resolveSortOptionForFolder } from "@/core/settings/settings-repository";

interface FolderRow {
  id: string;
  title: string;
  created_at: number;
  parent_id: string | null;
  parent_folder_id: string | null;
  sort_order: number;
  sort_setting: string | null;
}

interface FolderIdRow {
  id: string;
}

const mapFolderRow = (row: FolderRow): Folder => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  parentId: row.parent_folder_id ?? row.parent_id,
  sortOrder: row.sort_order,
  sortSetting: (row.sort_setting as SortOption | null) ?? null,
});

/**
 * Реалізація репозиторію папок на базі бази даних SQLite.
 */
export class SqliteFoldersRepository implements FoldersRepository {
  /**
   * Отримує список папок конкретного рівня ієрархії з урахуванням налаштованого типу сортування.
   */
  async getFolders(parentId: string | null = null): Promise<Folder[]> {
    const database = await getDatabase();
    const resolvedOption = await resolveSortOptionForFolder(parentId);

    let orderSql = "";
    switch (resolvedOption) {
      case "manual":
        orderSql = "sort_order ASC, created_at DESC";
        break;
      case "title_asc":
        orderSql = "LOWER(title) ASC, created_at DESC";
        break;
      case "created_at_desc":
      case "updated_at_desc":
      default:
        orderSql = "created_at DESC";
        break;
    }

    const rows =
      parentId === null
        ? await database.getAllAsync<FolderRow>(
            `SELECT * FROM folders WHERE parent_folder_id IS NULL ORDER BY ${orderSql}`
          )
        : await database.getAllAsync<FolderRow>(
            `SELECT * FROM folders WHERE parent_folder_id = ? ORDER BY ${orderSql}`,
            parentId
          );

    return rows.map(mapFolderRow);
  }

  /**
   * Повертає детальну інформацію про папку (аліас для getFolderById).
   */
  async getFolder(id: string): Promise<Folder | undefined> {
    return this.getFolderById(id);
  }

  /**
   * Знаходить папку за її унікальним ідентифікатором.
   */
  async getFolderById(folderId: string): Promise<Folder | undefined> {
    const database = await getDatabase();
    const row = await database.getFirstAsync<FolderRow>(
      "SELECT * FROM folders WHERE id = ?",
      folderId
    );

    return row ? mapFolderRow(row) : undefined;
  }

  /**
   * Отримує дочірні папки першого рівня для вказаної папки.
   */
  async getFolderChildren(folderId: string): Promise<Folder[]> {
    return this.getFolders(folderId);
  }

  /**
   * Отримує повний плоский список усіх папок з бази даних.
   */
  async getAllFolders(): Promise<Folder[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<FolderRow>(`
      SELECT *
      FROM folders
      ORDER BY
        parent_folder_id IS NOT NULL,
        parent_folder_id ASC,
        sort_order ASC,
        created_at DESC
    `);

    return rows.map(mapFolderRow);
  }

  /**
   * Повертає мінімальне значення sort_order мінус 1 для створення папки на початку списку.
   */
  async getFolderMinSortOrder(parentId: string | null): Promise<number> {
    const database = await getDatabase();
    const sortOrderResult =
      parentId === null
        ? await database.getFirstAsync<{ sort_order: number | null }>(
            "SELECT MIN(sort_order) - 1 AS sort_order FROM folders WHERE parent_folder_id IS NULL"
          )
        : await database.getFirstAsync<{ sort_order: number | null }>(
            "SELECT MIN(sort_order) - 1 AS sort_order FROM folders WHERE parent_folder_id = ?",
            parentId
          );
    return sortOrderResult?.sort_order ?? 0;
  }

  /**
   * Створює новий запис папки у таблиці `folders`.
   */
  async createFolder(
    id: string,
    title: string,
    sortOrder: number,
    parentId: string | null,
    createdAt: number
  ): Promise<void> {
    const database = await getDatabase();
    const safeTitle = typeof title === "string" ? title : "Untitled";

    await database.runAsync(
      `INSERT INTO folders (
        id,
        title,
        created_at,
        sort_order,
        parent_id,
        parent_folder_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      id,
      safeTitle,
      createdAt,
      sortOrder,
      parentId,
      parentId
    );
  }

  /**
   * Оновлює назву папки.
   */
  async renameFolder(folderId: string, newName: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      "UPDATE folders SET title = ? WHERE id = ?",
      newName,
      folderId
    );
  }

  /**
   * Видаляє один запис папки за її ідентифікатором.
   */
  async deleteFolderRecord(id: string): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("DELETE FROM folders WHERE id = ?", id);
  }

  /**
   * Оновлює значення sort_order для папки при ручному впорядкуванні.
   */
  async updateFolderSortOrder(id: string, sortOrder: number): Promise<void> {
    const database = await getDatabase();
    await database.runAsync("UPDATE folders SET sort_order = ? WHERE id = ?", sortOrder, id);
  }

  /**
   * Переносить папку до іншого батьківського каталогу.
   */
  async updateParentFolder(folderId: string, parentFolderId: string | null): Promise<void> {
    const database = await getDatabase();
    await database.runAsync(
      `UPDATE folders
       SET parent_folder_id = ?, parent_id = ?
       WHERE id = ?`,
      parentFolderId,
      parentFolderId,
      folderId
    );
  }

  /**
   * Масово переміщує декілька папок у нову батьківську директорію.
   */
  async moveFolders(folderIds: string[], parentFolderId: string | null): Promise<void> {
    const uniqueFolderIds = Array.from(new Set(folderIds));
    if (uniqueFolderIds.length === 0) {
      return;
    }

    const database = await getDatabase();
    await database.withExclusiveTransactionAsync(async (txn) => {
      if (parentFolderId === null) {
        const placeholders = uniqueFolderIds.map(() => "?").join(", ");
        await txn.runAsync(
          `UPDATE folders
           SET parent_folder_id = NULL,
               parent_id = NULL
           WHERE id IN (${placeholders})
             AND parent_folder_id IS NOT NULL`,
          ...uniqueFolderIds
        );
        return;
      }

      const placeholders = uniqueFolderIds.map(() => "?").join(", ");
      await txn.runAsync(
        `UPDATE folders
         SET parent_folder_id = ?,
             parent_id = ?
         WHERE id IN (${placeholders})
           AND (parent_folder_id IS NULL OR parent_folder_id <> ?)`,
        parentFolderId,
        parentFolderId,
        ...uniqueFolderIds,
        parentFolderId
      );
    });
  }

  /**
   * Рекурсивно збирає ідентифікатори всієї ієрархії дочірніх папок, починаючи з вказаного rootId.
   */
  async getFolderTreeIds(rootId: string): Promise<string[]> {
    const database = await getDatabase();
    const rows = await database.getAllAsync<FolderIdRow>(
      `
        WITH RECURSIVE folder_tree(id) AS (
          SELECT id FROM folders WHERE id = ?
          UNION
          SELECT folders.id
          FROM folders
          INNER JOIN folder_tree ON folders.parent_folder_id = folder_tree.id
        )
        SELECT id FROM folder_tree
      `,
      rootId
    );

    return rows.map((row) => row.id);
  }

  /**
   * Повертає список ID нотаток, які містяться у вказаних папках.
   */
  async getNotesInFolders(folderIds: string[]): Promise<{ id: string }[]> {
    if (folderIds.length === 0) return [];
    const database = await getDatabase();
    const placeholders = folderIds.map(() => "?").join(",");
    return database.getAllAsync<{ id: string }>(
      `SELECT id FROM notes WHERE folder_id IN (${placeholders})`,
      ...folderIds
    );
  }

  /**
   * Масово видаляє нотатки, їхні нагадування та пошукові індекси для вказаного списку папок.
   */
  async deleteNotesInFolders(folderIds: string[]): Promise<void> {
    if (folderIds.length === 0) return;
    const database = await getDatabase();
    const placeholders = folderIds.map(() => "?").join(",");

    await database.runAsync(
      `DELETE FROM reminders WHERE note_id IN (SELECT id FROM notes WHERE folder_id IN (${placeholders}))`,
      ...folderIds
    );
    await database.runAsync(
      `DELETE FROM notes_fts WHERE id IN (SELECT id FROM notes WHERE folder_id IN (${placeholders}))`,
      ...folderIds
    );
    await database.runAsync(
      `DELETE FROM notes WHERE folder_id IN (${placeholders})`,
      ...folderIds
    );
  }

  /**
   * Масово видаляє записи папок із таблиці `folders` за списком ID.
   */
  async deleteFoldersRecords(folderIds: string[]): Promise<void> {
    if (folderIds.length === 0) return;
    const database = await getDatabase();
    const placeholders = folderIds.map(() => "?").join(",");
    await database.runAsync(
      `DELETE FROM folders WHERE id IN (${placeholders})`,
      ...folderIds
    );
  }
}
