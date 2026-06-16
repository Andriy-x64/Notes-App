/**
 * Екран перегляду вмісту конкретної папки.
 * Відображає список нотаток усередині папки та дозволяє керувати її вмістом.
 */
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import {
  ArrowLeft,
  ArrowUpDown,
  FolderInput,
  FolderPlus,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Folder } from "@/features/folders";
import {
  FolderCard,
  deleteFolders,
  getFolder,
  useFolders,
} from "@/features/folders";
import { RenameFolderDialog } from "@/features/folders/components/rename-folder-dialog";
import { useAllFolders } from "@/features/folders/hooks/use-all-folders";
import { useFoldersStore } from "@/features/folders/store/folders-store";
import { getFolderDescendantIds } from "@/features/folders/utils/folder-tree";
import { NoteCard } from "@/features/notes/components/note-card";
import { useNotes } from "@/features/notes/hooks/use-notes";
import {
  deleteNotes,
  togglePinNotes,
} from "@/features/notes/services/note-service";
import { useNotesStore } from "@/features/notes/store/notes-store";
import type { Note } from "@/features/notes/types/note";
import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchResultsList } from "@/features/search/components/SearchResultsList";
import { useSearch } from "@/features/search/hooks/useSearch";
import { SortMenu } from "@/features/sorting/components/SortMenu";
import { useSort } from "@/features/sorting/hooks/useSort";
import { useSortStore } from "@/features/sorting/store/sort-store";
import { ConfirmDialog, MoveDialog } from "@/shared/ui/dialogs";
import { KebabMenu } from "@/shared/ui/menus/kebab-menu";

type FolderContentItem =
  | { folder: Folder; id: string; type: "folder" }
  | { id: string; note: Note; type: "note" };

const getRouteId = (id: string | string[] | undefined) => {
  return Array.isArray(id) ? id[0] : id;
};

const selectionKey = (type: FolderContentItem["type"], id: string) =>
  `${type}:${id}`;

const getSelectionParts = (key: string) => {
  const [type, ...rest] = key.split(":");
  return { id: rest.join(":"), type };
};

export default function FolderNotesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const folderId = getRouteId(routeId);
  const {
    addFolder,
    folders,
    isLoading: isFoldersLoading,
    reloadFolders,
    reorderFolders,
  } = useFolders(folderId ?? null);
  const { notes, reloadNotes } = useNotes(folderId ?? null);
  const { folders: allFolders } = useAllFolders();
  const [folderTitle, setFolderTitle] = useState("Folder");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isMoveDialogVisible, setIsMoveDialogVisible] = useState(false);
  // Стан меню дій для поточної папки (не в режимі вибору)
  const [isFolderKebabOpen, setIsFolderKebabOpen] = useState(false);
  const [isRenameFolderDialogVisible, setIsRenameFolderDialogVisible] =
    useState(false);
  const [isDeleteFolderDialogVisible, setIsDeleteFolderDialogVisible] =
    useState(false);
  const [isMoveFolderDialogVisible, setIsMoveFolderDialogVisible] =
    useState(false);

  const { sortOption, folderSortSetting, updateFolderSort } = useSort(folderId);
  const triggerRefresh = useSortStore((state) => state.triggerRefresh);
  const folderRefreshToken = useFoldersStore((state) => state.refreshToken);
  const moveNotes = useNotesStore((state) => state.moveNotes);
  const moveFolders = useFoldersStore((state) => state.moveFolders);

  const search = useSearch("specific_folder", folderId);
  const selectedIds = useMemo(() => Array.from(selectedKeys), [selectedKeys]);

  const selectedNoteIds = useMemo(
    () =>
      selectedIds
        .filter((key) => key.startsWith("note:"))
        .map((key) => key.split(":")[1]),
    [selectedIds],
  );

  const selectedFolderIds = useMemo(
    () =>
      selectedIds
        .filter((key) => key.startsWith("folder:"))
        .map((key) => key.split(":")[1]),
    [selectedIds],
  );

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.includes(n.id)),
    [notes, selectedNoteIds],
  );

  const allPinned = useMemo(
    () => selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned),
    [selectedNotes],
  );

  const moveDialogMode: "note" | "folder" | "mixed" =
    selectedFolderIds.length > 0
      ? selectedNoteIds.length > 0
        ? "mixed"
        : "folder"
      : "note";

  const moveDialogExcludedFolderIds = useMemo(() => {
    if (selectedFolderIds.length === 0) {
      return [];
    }

    const descendantIds = getFolderDescendantIds(allFolders, selectedFolderIds);
    return Array.from(new Set([...selectedFolderIds, ...descendantIds]));
  }, [allFolders, selectedFolderIds]);

  const reloadContent = useCallback(async () => {
    if (!folderId) {
      return;
    }

    const currentFolder = await getFolder(folderId);
    setFolderTitle(currentFolder?.title ?? "Folder");

    await Promise.all([reloadFolders(), reloadNotes()]);
  }, [folderId, reloadFolders, reloadNotes]);

  useEffect(() => {
    void reloadContent();
  }, [folderRefreshToken, reloadContent]);

  useFocusEffect(
    useCallback(() => {
      reloadContent();
    }, [reloadContent]),
  );

  useFocusEffect(
    useCallback(() => {
      const closeSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedKeys(new Set());
      };

      const handleBackPress = () => {
        if (!isSelectionMode) {
          return false;
        }

        closeSelectionMode();
        return true;
      };

      const backSubscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress,
      );

      const beforeRemoveSubscription = navigation.addListener(
        "beforeRemove",
        (event) => {
          if (!isSelectionMode) {
            return;
          }

          event.preventDefault();
          closeSelectionMode();
        },
      );

      return () => {
        backSubscription.remove();
        beforeRemoveSubscription();
      };
    }, [isSelectionMode, navigation]),
  );

  const closeSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedKeys(new Set());
  };

  const closeCreateModal = () => {
    setNewFolderTitle("");
    setIsCreateModalVisible(false);
  };

  const handleCreateSubfolder = async () => {
    const safeTitle = newFolderTitle.trim();

    if (!safeTitle) {
      return;
    }

    await addFolder(safeTitle);
    closeCreateModal();
  };

  const handleOpenCreateSubfolder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreateModalVisible(true);
  };

  const handleCreateNote = () => {
    if (!folderId) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/note/new?folderId=${encodeURIComponent(folderId)}` as Href);
  };

  const handleOpenFolder = (folder: Folder) => {
    if (isSelectionMode) {
      const key = selectionKey("folder", folder.id);
      setSelectedKeys((previousKeys) => {
        const nextKeys = new Set(previousKeys);

        if (nextKeys.has(key)) {
          nextKeys.delete(key);
        } else {
          nextKeys.add(key);
        }

        return nextKeys;
      });
      return;
    }

    router.push({
      params: { id: folder.id },
      pathname: "/folder/[id]",
    } as unknown as Href);
  };

  const handleFolderLongPress = (folder: Folder) => {
    if (isDragging) {
      return;
    }

    Haptics.selectionAsync();
    setIsSelectionMode(true);
    setSelectedKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      nextKeys.add(selectionKey("folder", folder.id));

      return nextKeys;
    });
  };

  const handleOpenNote = (note: Note) => {
    if (isSelectionMode) {
      const key = selectionKey("note", note.id);
      setSelectedKeys((previousKeys) => {
        const nextKeys = new Set(previousKeys);

        if (nextKeys.has(key)) {
          nextKeys.delete(key);
        } else {
          nextKeys.add(key);
        }

        return nextKeys;
      });
      return;
    }

    router.push(`/note/${note.id}` as Href);
  };

  const handleNoteLongPress = (note: Note) => {
    Haptics.selectionAsync();
    setIsSelectionMode(true);
    setSelectedKeys((previousKeys) => {
      const nextKeys = new Set(previousKeys);
      nextKeys.add(selectionKey("note", note.id));

      return nextKeys;
    });
  };

  const folderKebabItems = useMemo(
    () => [
      {
        id: "rename",
        label: "Перейменувати папку",
        Icon: Pencil,
        onPress: () => setIsRenameFolderDialogVisible(true),
      },
      {
        id: "move",
        label: "Перемістити папку",
        Icon: FolderInput,
        onPress: () => setIsMoveFolderDialogVisible(true),
      },
      {
        id: "delete",
        label: "Видалити папку",
        Icon: Trash2,
        onPress: () => setIsDeleteFolderDialogVisible(true),
        destructive: true,
      },
    ],
    [],
  );

  const handleDeleteSelected = () => {
    if (selectedIds.length > 0) {
      setIsDeleteDialogVisible(true);
    }
  };

  const handleConfirmDeleteSelected = async () => {
    const folderIdsToDelete: string[] = [];
    const noteIdsToDelete: string[] = [];

    for (const key of selectedIds) {
      const { id, type } = getSelectionParts(key);

      if (type === "folder") {
        folderIdsToDelete.push(id);
      } else if (type === "note") {
        noteIdsToDelete.push(id);
      }
    }

    if (folderIdsToDelete.length > 0) {
      await deleteFolders(folderIdsToDelete);
    }

    if (noteIdsToDelete.length > 0) {
      await deleteNotes(noteIdsToDelete);
    }

    closeSelectionMode();
    setIsDeleteDialogVisible(false);
    triggerRefresh();
  };

  const handleMoveSelected = () => {
    if (selectedIds.length > 0) {
      setIsMoveDialogVisible(true);
    }
  };

  const handleConfirmMoveSelected = async (targetFolderId: string | null) => {
    if (selectedFolderIds.length > 0) {
      await moveFolders(selectedFolderIds, targetFolderId);
    }

    if (selectedNoteIds.length > 0) {
      await moveNotes(selectedNoteIds, targetFolderId);
    }

    closeSelectionMode();
    setIsMoveDialogVisible(false);
  };

  const handlePinSelectedNotes = async () => {
    if (selectedNoteIds.length === 0) {
      return;
    }

    await togglePinNotes(selectedNoteIds, !allPinned);
    closeSelectionMode();
    triggerRefresh();
  };

  // ── Current-folder kebab actions ───────────────────────────────────────────

  const handleDeleteCurrentFolder = async () => {
    if (!folderId) return;
    await deleteFolders([folderId]);
    setIsDeleteFolderDialogVisible(false);
    router.back();
  };

  const currentFolderMoveExcludedIds = useMemo(() => {
    if (!folderId) return [];
    const descendantIds = getFolderDescendantIds(allFolders, [folderId]);
    return Array.from(new Set([folderId, ...descendantIds]));
  }, [allFolders, folderId]);

  const handleConfirmMoveCurrentFolder = async (
    targetFolderId: string | null,
  ) => {
    if (!folderId) return;
    await moveFolders([folderId], targetFolderId);
    setIsMoveFolderDialogVisible(false);
    router.back();
  };

  const renderFolderItem = ({
    drag,
    isActive,
    item,
  }: RenderItemParams<Folder>) => (
    <FolderCard
      folder={item}
      isDragActive={isActive}
      isDragDisabled={isSelectionMode || isDragging || sortOption !== "manual"}
      isSelected={selectedKeys.has(selectionKey("folder", item.id))}
      isSelectionMode={isSelectionMode}
      onDrag={drag}
      onLongPress={() => handleFolderLongPress(item)}
      onPress={() => handleOpenFolder(item)}
    />
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
        <View style={styles.header}>
          {isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={closeSelectionMode}
              style={styles.iconButton}
            >
              <X color="#FFF" size={24} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <ArrowLeft color="#FFF" size={24} />
            </TouchableOpacity>
          )}

          <Text numberOfLines={1} style={styles.title}>
            {folderTitle}
          </Text>

          {isSelectionMode ? (
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
                disabled={selectedIds.length === 0}
                onPress={handleDeleteSelected}
                style={styles.iconButton}
              >
                <Trash2
                  color={selectedIds.length > 0 ? "#EF4444" : "#555"}
                  size={24}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
                disabled={selectedNoteIds.length === 0}
                onPress={handlePinSelectedNotes}
                style={styles.iconButton}
              >
                {allPinned ? (
                  <PinOff color="#3B82F6" size={24} />
                ) : (
                  <Pin
                    color={selectedNoteIds.length > 0 ? "#3B82F6" : "#555"}
                    size={24}
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
                disabled={selectedIds.length === 0}
                onPress={handleMoveSelected}
                style={styles.iconButton}
              >
                <FolderInput
                  color={selectedIds.length > 0 ? "#3B82F6" : "#555"}
                  size={24}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setIsSortModalVisible(true)}
                style={styles.iconButton}
              >
                <ArrowUpDown color="#FFF" size={24} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleOpenCreateSubfolder}
                style={styles.iconButton}
              >
                <FolderPlus color="#FFF" size={26} />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => setIsFolderKebabOpen(true)}
                style={styles.iconButton}
              >
                <MoreVertical color="#FFF" size={24} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* Пошук */}
        <View style={styles.searchContainer}>
          <SearchBar
            onChangeText={search.setQuery}
            placeholder="Пошук у папці"
            value={search.query}
          />
        </View>
        {search.hasQuery ? (
          <View style={styles.searchResultsContainer}>
            <SearchResultsList
              error={search.error}
              isLoading={search.isLoading}
              results={search.results}
            />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 120 },
            ]}
            data={notes}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              folders.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Підпапки</Text>
                  <DraggableFlatList
                    activationDistance={8}
                    animationConfig={{
                      damping: 22,
                      mass: 0.25,
                      overshootClamping: true,
                      stiffness: 250,
                    }}
                    data={folders}
                    keyExtractor={(item) => item.id}
                    onDragBegin={() => setIsDragging(true)}
                    onDragEnd={({ data }) => {
                      setIsDragging(false);
                      reorderFolders(data);
                    }}
                    scrollEnabled={false}
                    renderItem={renderFolderItem}
                  />
                </View>
              ) : null
            }
            // Показувати порожній стан лише якщо немає ні нотаток, ні папок
            ListEmptyComponent={
              notes.length === 0 && folders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Ця папка порожня</Text>
                  <Text style={styles.emptyText}>
                    Додайте підпапку або створіть нотатку тут.
                  </Text>
                </View>
              ) : null
            }
            onRefresh={reloadContent}
            refreshing={isFoldersLoading}
            renderItem={({ item }) => (
              <NoteCard
                isSelected={selectedKeys.has(selectionKey("note", item.id))}
                isSelectionMode={isSelectionMode}
                note={item}
                onLongPress={() => handleNoteLongPress(item)}
                onPress={() => handleOpenNote(item)}
              />
            )}
          />
        )}
        {!isSelectionMode && !search.hasQuery ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleCreateNote}
            style={[styles.fabContainer, { bottom: insets.bottom + 30 }]}
          >
            <View style={styles.fab}>
              <Plus color="#FFF" size={28} />
            </View>
          </TouchableOpacity>
        ) : null}
        <Modal
          animationType="fade"
          onRequestClose={closeCreateModal}
          transparent
          visible={isCreateModalVisible}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={[
              styles.modalOverlay,
              {
                paddingBottom: insets.bottom + 20,
                paddingTop: insets.top + 20,
              },
            ]}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Нова підпапка</Text>
              <TextInput
                autoFocus
                onChangeText={setNewFolderTitle}
                onSubmitEditing={handleCreateSubfolder}
                placeholder="Назва папки"
                placeholderTextColor="#777"
                returnKeyType="done"
                style={styles.input}
                value={newFolderTitle}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={closeCreateModal}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Скасувати</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.75}
                  disabled={!newFolderTitle.trim()}
                  onPress={handleCreateSubfolder}
                  style={[
                    styles.primaryButton,
                    !newFolderTitle.trim() && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Створити</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <SortMenu
          currentValue={folderSortSetting}
          onClose={() => setIsSortModalVisible(false)}
          onSelect={updateFolderSort}
          showManual={true}
          showUseGlobal={true}
          visible={isSortModalVisible}
        />
        {/* Діалог підтвердження видалення вибраних нотаток/папок */}
        <ConfirmDialog
          confirmLabel="Видалити"
          isDestructive
          message={`Видалити ${selectedIds.length} вибраних елементів?`}
          onCancel={() => setIsDeleteDialogVisible(false)}
          onConfirm={handleConfirmDeleteSelected}
          title="Видалити вибрані елементи?"
          visible={isDeleteDialogVisible}
        />
        {/* Діалог переміщення вибраних нотаток/папок у іншу папку */}
        <MoveDialog
          excludedFolderIds={moveDialogExcludedFolderIds}
          folders={allFolders}
          mode={moveDialogMode}
          onClose={() => setIsMoveDialogVisible(false)}
          onConfirm={handleConfirmMoveSelected}
          selectedCount={selectedIds.length}
          visible={isMoveDialogVisible}
        />
        {/* Діалог видалення папки */}
        <ConfirmDialog
          confirmLabel="Видалити"
          isDestructive
          message="Папку буде видалено разом із усім вмістом."
          onCancel={() => setIsDeleteFolderDialogVisible(false)}
          onConfirm={handleDeleteCurrentFolder}
          title="Видалити папку?"
          visible={isDeleteFolderDialogVisible}
        />
        <MoveDialog
          excludedFolderIds={currentFolderMoveExcludedIds}
          folders={allFolders}
          mode="folder"
          onClose={() => setIsMoveFolderDialogVisible(false)}
          onConfirm={handleConfirmMoveCurrentFolder}
          selectedCount={1}
          visible={isMoveFolderDialogVisible}
        />
        <RenameFolderDialog
          currentName={folderTitle}
          folderId={folderId ?? ""}
          onClose={() => setIsRenameFolderDialogVisible(false)}
          visible={isRenameFolderDialogVisible}
        />
        <KebabMenu
          items={folderKebabItems}
          visible={isFolderKebabOpen}
          onClose={() => setIsFolderKebabOpen(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    minHeight: 76,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E2A30",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  title: {
    flex: 1,
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    gap: 16,
    padding: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
  },
  input: {
    height: 48,
    paddingHorizontal: 14,
    color: "#FFF",
    backgroundColor: "#121212",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  secondaryButton: {
    minWidth: 92,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  secondaryButtonText: {
    color: "#DDD",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    minWidth: 92,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  sortModalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  sortModalCard: {
    width: "100%",
    maxWidth: 340,
    padding: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  sortModalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  sortOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  sortOptionRowActive: {
    backgroundColor: "#202A3A",
  },
  sortOptionText: {
    color: "#BBB",
    fontSize: 16,
    fontWeight: "600",
  },
  sortOptionTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  sortModalCloseButton: {
    marginTop: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252525",
    borderRadius: 12,
  },
  sortModalCloseButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
