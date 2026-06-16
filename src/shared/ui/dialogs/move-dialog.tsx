/**
 * Діалог переміщення елементів (нотаток або папок).
 * Відображає ієрархічне дерево папок та дозволяє користувачеві вибрати цільову папку для переміщення.
 */
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderInput,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { Folder } from "@/features/folders/types/folder";
import { buildFolderChildrenMap } from "@/features/folders/utils/folder-tree";
import { DialogActions } from "@/shared/ui/dialogs/DialogActions";
import { DialogBody } from "@/shared/ui/dialogs/DialogBody";
import { DialogContainer } from "@/shared/ui/dialogs/DialogContainer";
import { DialogHeader } from "@/shared/ui/dialogs/DialogHeader";
import { DialogOverlay } from "@/shared/ui/dialogs/DialogOverlay";

type MoveDialogMode = "note" | "folder" | "mixed";

interface MoveDialogProps {
  excludedFolderIds?: string[];
  folders: Folder[];
  mode: MoveDialogMode;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void | Promise<void>;
  selectedCount: number;
  visible: boolean;
}

const INDENT_PER_LEVEL = 20; // пікселів на рівень глибини
const LINE_OFFSET = 10; // де розташовується вертикальна лінія всередині відступу

const getTitle = (mode: MoveDialogMode, selectedCount: number) => {
  if (mode === "note") return "Перемістити нотатки";
  if (mode === "folder")
    return selectedCount > 1 ? "Перемістити папки" : "Перемістити папку";
  return "Перемістити вибране";
};

const getRootLabel = (mode: MoveDialogMode) => {
  if (mode === "note") return "Основні нотатки";
  return "Корінь";
};

// ─── Вузол дерева, який відображається рекурсивно ──────────────────────────

interface TreeNodeProps {
  depth: number;
  /** масив булевих значень — чи є предок на цій глибині останнім елементом? */
  lastChildFlags: boolean[];
  folder: Folder;
  childrenMap: Map<string | null, Folder[]>;
  excludedIds: Set<string>;
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
}

function TreeNode({
  depth,
  lastChildFlags,
  folder,
  childrenMap,
  excludedIds,
  expandedIds,
  selectedId,
  onToggleExpand,
  onSelect,
}: TreeNodeProps) {
  const rawChildren = childrenMap.get(folder.id) ?? [];
  const children = rawChildren.filter((c) => !excludedIds.has(c.id));
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedId === folder.id;

  return (
    <View>
      {/* ── Row ────────────────────────────────────────────────────────── */}
      <Pressable
        accessibilityRole="button"
        onPress={() => onSelect(folder.id)}
        style={({ pressed }) => [
          styles.row,
          isSelected && styles.rowSelected,
          pressed && styles.rowPressed,
        ]}
      >
        {/* Область відступу з вертикальними лініями дерева */}
        <View style={styles.indentArea}>
          {Array.from({ length: depth }).map((_, i) => {
            const isImmediateParent = i === depth - 1;
            const isLast = lastChildFlags[i];
            return (
              <View
                key={i}
                style={[styles.indentSlot, { width: INDENT_PER_LEVEL }]}
              >
                {/* Vertical line */}
                {isImmediateParent ? (
                  isLast ? (
                    <View
                      style={[styles.verticalLineHalf, { left: LINE_OFFSET }]}
                    />
                  ) : (
                    <View
                      style={[styles.verticalLine, { left: LINE_OFFSET }]}
                    />
                  )
                ) : (
                  !isLast && (
                    <View
                      style={[styles.verticalLine, { left: LINE_OFFSET }]}
                    />
                  )
                )}

                {/* Горизонтальна лінія для безпосереднього батьківського елемента */}
                {isImmediateParent && (
                  <View
                    style={[
                      styles.horizontalLine,
                      { left: LINE_OFFSET, right: 0 },
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Chevron toggle */}
        <TouchableOpacity
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={() => hasChildren && onToggleExpand(folder.id)}
          style={styles.chevronBtn}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown color="#93C5FD" size={16} />
            ) : (
              <ChevronRight color="#93C5FD" size={16} />
            )
          ) : (
            // Пробіл для вирівнювання іконки, якщо немає шеврона
            <View style={{ width: 16 }} />
          )}
        </TouchableOpacity>

        {/* Іконка папки */}
        <FolderIcon
          color={isSelected ? "#3B82F6" : "#93C5FD"}
          size={18}
          style={styles.folderIcon}
        />

        {/* Title */}
        <Text
          numberOfLines={1}
          style={[styles.rowTitle, isSelected && styles.rowTitleSelected]}
        >
          {folder.title.trim() || "Untitled Folder"}
        </Text>
      </Pressable>

      {/* ── Children ───────────────────────────────────────────────────── */}
      {hasChildren && isExpanded && (
        <View>
          {children.map((child, idx) => {
            const isLast = idx === children.length - 1;
            return (
              <TreeNode
                key={child.id}
                depth={depth + 1}
                lastChildFlags={[...lastChildFlags, isLast]}
                folder={child}
                childrenMap={childrenMap}
                excludedIds={excludedIds}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Головний діалог ──────────────────────────────────────────────────────────

export function MoveDialog({
  excludedFolderIds = [],
  folders,
  mode,
  onClose,
  onConfirm,
  selectedCount,
  visible,
}: MoveDialogProps) {
  const excludedIds = useMemo(
    () => new Set(excludedFolderIds),
    [excludedFolderIds],
  );
  const [selectedTargetFolderId, setSelectedTargetFolderId] = useState<
    string | null
  >(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Скидаємо вибір і згортаємо все, коли діалог відкривається або змінюється
  useEffect(() => {
    setSelectedTargetFolderId(null);
    setExpandedIds(new Set());
  }, [visible, mode, excludedFolderIds]);

  const childrenMap = useMemo(() => buildFolderChildrenMap(folders), [folders]);

  // Папки верхнього рівня (parentId === null), які не виключені
  const rootFolders = useMemo(() => {
    const roots = childrenMap.get(null) ?? [];
    return roots.filter((f) => !excludedIds.has(f.id));
  }, [childrenMap, excludedIds]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleConfirm = () => {
    void onConfirm(selectedTargetFolderId);
  };

  return (
    <DialogOverlay dismissible onClose={onClose} visible={visible}>
      <DialogContainer>
        <DialogHeader
          subtitle={
            selectedCount > 0 ? `Вибрано ${selectedCount} елементів` : undefined
          }
          title={getTitle(mode, selectedCount)}
        />
        <DialogBody>
          <View style={styles.listContainer}>
            {/* Опція корінь / "без папки" */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedTargetFolderId(null)}
              style={({ pressed }) => [
                styles.row,
                styles.rootRow,
                selectedTargetFolderId === null && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
            >
              <FolderInput
                color={selectedTargetFolderId === null ? "#3B82F6" : "#93C5FD"} // Акцент для вибраного рядка.
                size={18}
                style={styles.folderIcon}
              />
              <Text
                style={[
                  styles.rowTitle,
                  selectedTargetFolderId === null && styles.rowTitleSelected,
                ]}
              >
                {getRootLabel(mode)}
              </Text>
            </Pressable>

            {/* Separator */}
            <View style={styles.separator} />

            {/* Дерево папок */}
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {rootFolders.length > 0 ? (
                rootFolders.map((folder, idx) => {
                  const isLast = idx === rootFolders.length - 1;
                  return (
                    <TreeNode
                      key={folder.id}
                      depth={0}
                      lastChildFlags={[isLast]}
                      folder={folder}
                      childrenMap={childrenMap}
                      excludedIds={excludedIds}
                      expandedIds={expandedIds}
                      selectedId={selectedTargetFolderId}
                      onToggleExpand={handleToggleExpand}
                      onSelect={setSelectedTargetFolderId}
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyHint}>Немає доступних папок.</Text>
              )}
            </ScrollView>
          </View>
        </DialogBody>
        <DialogActions
          actions={[
            { label: "Скасувати", onPress: onClose },
            {
              label: "Перемістити",
              onPress: handleConfirm,
              variant: "primary",
            },
          ]}
        />
      </DialogContainer>
    </DialogOverlay>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    maxHeight: 400,
    gap: 0,
  },
  scrollContent: {
    paddingBottom: 4,
  },

  // ── Кореневий рядок ────────────────────────────────────────────────────────────────
  rootRow: {
    marginBottom: 0,
  },

  // ── Звичайний рядок ─────────────────────────────────────────────────────────────
  row: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 2,
  },
  // Акцент для вибраного рядка. (фон)
  rowSelected: {
    backgroundColor: "#202A3A",
  },
  // Акцент при натисканні на рядок.
  rowPressed: {
    backgroundColor: "#1A1A2E",
  },
  // Текст рядка.
  rowTitle: {
    flex: 1,
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "600",
  },
  // Акцент для вибраного рядка. (текст)
  rowTitleSelected: {
    color: "#93C5FD",
    fontWeight: "700",
  },

  // ── Іконки ───────────────────────────────────────────────────────────────────
  folderIcon: {
    marginRight: 8,
  },
  chevronBtn: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },

  indentArea: {
    flexDirection: "row",
    alignSelf: "stretch",
  },
  indentSlot: {
    height: "100%",
    position: "relative",
  },
  // Лінії для дерев навігації.//
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#4f5f7b",
  },
  // Коротша вертикальна лінія для останньої гілки (папки).
  verticalLineHalf: {
    position: "absolute",
    top: 0,
    height: "50%",
    width: 1,
    backgroundColor: "#4f5f7b",
  },
  horizontalLine: {
    position: "absolute",
    top: "50%",
    height: 1,
    backgroundColor: "#4f5f7b",
  },

  // ── Різне ────────────────────────────────────────────────────────────────────
  // Роздільник між "коренем" і деревом папок.
  separator: {
    height: 1,
    backgroundColor: "#4f5f7b",
    marginVertical: 6,
    marginHorizontal: 4,
  },
  // Підказка, коли немає папок для вибору.
  emptyHint: {
    color: "#A3A3A3",
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
});
