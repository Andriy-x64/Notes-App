/**
 * Екран головного списку нотаток.
 * Відображає список усіх нотаток користувача, підтримує режим виділення кількох нотаток, їх видалення, закріплення та переміщення.
 */
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  ArrowUpDown,
  FolderInput,
  Pin,
  PinOff,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAllFolders } from "@/features/folders/hooks/use-all-folders";
import { AddButton } from "@/features/notes/components/add-button";
import { EmptyState } from "@/features/notes/components/empty-state";
import { NoteCard } from "@/features/notes/components/note-card";
import { useNotes } from "@/features/notes/hooks/use-notes";
import {
  deleteNotes,
  togglePinNotes,
} from "@/features/notes/services/note-service";
import { useNotesStore } from "@/features/notes/store/notes-store";
import { SortMenu } from "@/features/sorting/components/SortMenu";
import { useSort } from "@/features/sorting/hooks/useSort";
import { useSortStore } from "@/features/sorting/store/sort-store";
import { ConfirmDialog, MoveDialog } from "@/shared/ui/dialogs";

export default function NotesListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { notes, reloadNotes } = useNotes(null);
  const { folders: allFolders } = useAllFolders();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isMoveDialogVisible, setIsMoveDialogVisible] = useState(false);

  const { sortOption, updateGlobalSort } = useSort(null);
  const triggerRefresh = useSortStore((state) => state.triggerRefresh);
  const moveNotes = useNotesStore((state) => state.moveNotes);

  const selectedIds = useMemo(
    () => Array.from(selectedNoteIds),
    [selectedNoteIds],
  );

  const selectedNotes = useMemo(
    () => notes.filter((n) => selectedNoteIds.has(n.id)),
    [notes, selectedNoteIds],
  );

  const allPinned = useMemo(
    () => selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned),
    [selectedNotes],
  );

  useFocusEffect(
    useCallback(() => {
      reloadNotes();
    }, [reloadNotes]),
  );

  useFocusEffect(
    useCallback(() => {
      const closeSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedNoteIds(new Set());
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
    setSelectedNoteIds(new Set());
  };

  const handleCreateNote = () => {
    router.push("/note/new");
  };

  const handleEditNote = (id: string) => {
    router.push(`/note/${id}`);
  };

  const toggleNoteSelection = (id: string) => {
    setSelectedNoteIds((previousIds) => {
      const nextIds = new Set(previousIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  };

  const handleNotePress = (id: string) => {
    if (isSelectionMode) {
      toggleNoteSelection(id);
      return;
    }

    handleEditNote(id);
  };

  const handleNoteLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedNoteIds((previousIds) => {
      const nextIds = new Set(previousIds);
      nextIds.add(id);

      return nextIds;
    });
  };

  const handleDeleteSelectedNotes = () => {
    if (selectedIds.length > 0) {
      setIsDeleteDialogVisible(true);
    }
  };

  const handleMoveSelectedNotes = () => {
    if (selectedIds.length > 0) {
      setIsMoveDialogVisible(true);
    }
  };

  const handleConfirmDeleteSelectedNotes = async () => {
    await deleteNotes(selectedIds);
    closeSelectionMode();
    setIsDeleteDialogVisible(false);
    triggerRefresh();
  };

  const handleConfirmMoveSelectedNotes = async (
    targetFolderId: string | null,
  ) => {
    await moveNotes(selectedIds, targetFolderId);
    closeSelectionMode();
    setIsMoveDialogVisible(false);
  };

  const handlePinSelectedNotes = async () => {
    if (selectedIds.length === 0) {
      return;
    }

    await togglePinNotes(selectedIds, !allPinned);
    closeSelectionMode();
    triggerRefresh();
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        {isSelectionMode ? (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={closeSelectionMode}
            style={styles.headerButton}
          >
            <X color="#FFF" size={24} />
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>My Notes</Text>
        )}

        {isSelectionMode ? (
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
              disabled={selectedIds.length === 0}
              onPress={handleDeleteSelectedNotes}
              style={styles.headerButton}
            >
              <Trash2
                color={selectedIds.length > 0 ? "#EF4444" : "#555"}
                size={24}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
              disabled={selectedIds.length === 0}
              onPress={handlePinSelectedNotes}
              style={styles.headerButton}
            >
              {allPinned ? (
                <PinOff color="#3B82F6" size={24} />
              ) : (
                <Pin
                  color={selectedIds.length > 0 ? "#3B82F6" : "#555"}
                  size={24}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
              disabled={selectedIds.length === 0}
              onPress={handleMoveSelectedNotes}
              style={styles.headerButton}
            >
              <FolderInput
                color={selectedIds.length > 0 ? "#3B82F6" : "#555"}
                size={24}
              />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setIsSortMenuVisible(true)}
            style={styles.headerButton}
          >
            <ArrowUpDown color="#FFF" size={22} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        data={notes}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <NoteCard
            isSelected={selectedNoteIds.has(item.id)}
            isSelectionMode={isSelectionMode}
            note={item}
            onLongPress={() => handleNoteLongPress(item.id)}
            onPress={() => handleNotePress(item.id)}
          />
        )}
      />
      {!isSelectionMode ? <AddButton onPress={handleCreateNote} /> : null}
      {/* Меню сортування нотаток */}
      <SortMenu
        currentValue={sortOption}
        onClose={() => setIsSortMenuVisible(false)}
        onSelect={updateGlobalSort}
        showManual={false}
        showUseGlobal={false}
        visible={isSortMenuVisible}
      />
      {/* Діалог підтвердження видалення нотаток */}
      <ConfirmDialog
        confirmLabel="Видалити"
        isDestructive
        message={`Видалити ( ${selectedIds.length} ) вибраних нотаток?`}
        onCancel={() => setIsDeleteDialogVisible(false)}
        onConfirm={handleConfirmDeleteSelectedNotes}
        title="Видалити нотатки?"
        visible={isDeleteDialogVisible}
      />
      {/* Діалог переміщення нотаток у папку */}
      <MoveDialog
        folders={allFolders}
        mode="note"
        onClose={() => setIsMoveDialogVisible(false)}
        onConfirm={handleConfirmMoveSelectedNotes}
        selectedCount={selectedIds.length}
        visible={isMoveDialogVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  searchIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexGrow: 1,
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
    maxWidth: 340,
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
  modalCloseButton: {
    marginTop: 16,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#252525",
    borderRadius: 12,
  },
  modalCloseButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
