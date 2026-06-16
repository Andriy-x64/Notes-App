/**
 * Утиліти для побудови та обробки ієрархічного дерева папок.
 * Використовується для знаходження дочірніх елементів, побудови мапи ієрархії та фільтрації.
 */
import type { Folder } from "@/features/folders/types/folder";

const sortFolders = (folders: Folder[]) =>
  [...folders].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.createdAt !== right.createdAt) {
      return right.createdAt - left.createdAt;
    }

    return left.title.localeCompare(right.title);
  });

export const buildFolderChildrenMap = (folders: Folder[]) => {
  const childrenMap = new Map<string | null, Folder[]>();

  for (const folder of folders) {
    const parentKey = folder.parentId;
    const currentChildren = childrenMap.get(parentKey) ?? [];
    currentChildren.push(folder);
    childrenMap.set(parentKey, currentChildren);
  }

  for (const [key, value] of childrenMap.entries()) {
    childrenMap.set(key, sortFolders(value));
  }

  return childrenMap;
};

export const getFolderDescendantIds = (folders: Folder[], rootIds: string[]) => {
  const childrenMap = buildFolderChildrenMap(folders);
  const descendants = new Set<string>();
  const queue = [...rootIds];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const children = childrenMap.get(currentId) ?? [];
    for (const child of children) {
      if (descendants.has(child.id)) {
        continue;
      }

      descendants.add(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
};

export interface FolderTreeEntry {
  depth: number;
  folder: Folder;
  hasChildren: boolean;
}

export const buildFolderTreeEntries = (
  folders: Folder[],
  excludedIds: Set<string> = new Set()
): FolderTreeEntry[] => {
  const childrenMap = buildFolderChildrenMap(folders);
  const entries: FolderTreeEntry[] = [];

  const walk = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      if (excludedIds.has(child.id)) {
        continue;
      }

      const visibleChildren = (childrenMap.get(child.id) ?? []).filter(
        (c) => !excludedIds.has(c.id)
      );
      entries.push({ depth, folder: child, hasChildren: visibleChildren.length > 0 });
      walk(child.id, depth + 1);
    }
  };

  walk(null, 0);
  return entries;
};
