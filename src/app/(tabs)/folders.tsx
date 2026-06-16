/**
 * Екран списку папок користувача.
 * Дозволяє переглядати, створювати, перейменовувати, переміщувати та видаляти папки для структурування нотаток.
 */
import {
  ArrowUpDown,
  FolderInput,
  FolderPlus,
  Trash2,
  X,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import type { Folder } from "@/features/folders";
import { FolderCard } from "@/features/folders";
import { CreateFolderModal } from "@/features/folders/components/create-folder-modal";
import { useFoldersScreenState } from "@/features/folders/hooks/use-folders-screen-state";
import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchResultsList } from "@/features/search/components/SearchResultsList";
import { SortMenu } from "@/features/sorting/components/SortMenu";
import { ConfirmDialog, MoveDialog } from "@/shared/ui/dialogs";

export default function FoldersScreen() {
  const insets = useSafeAreaInsets();
  const {
    folders,
    allFolders,
    isLoading,
    reloadFolders,
    folderTitle,
    setFolderTitle,
    isCreateModalVisible,
    isSelectionMode,
    selectedFolderIds,
    isSortMenuVisible,
    setIsSortMenuVisible,
    isDeleteDialogVisible,
    setIsDeleteDialogVisible,
    isMoveDialogVisible,
    setIsMoveDialogVisible,
    moveDialogExcludedFolderIds,
    sortOption,
    updateGlobalSort,
    search,
    selectedIds,
    closeSelectionMode,
    closeCreateModal,
    handleCreateFolder,
    handleFolderPress,
    handleFolderLongPress,
    handleDeleteSelectedFolders,
    handleConfirmDeleteSelectedFolders,
    handleMoveSelectedFolders,
    handleConfirmMoveSelectedFolders,
    handleOpenCreateModal,
    handleDragEnd,
  } = useFoldersScreenState();

  const renderFolder = ({ drag, isActive, item }: RenderItemParams<Folder>) => (
    <FolderCard
      folder={item}
      isDragActive={isActive}
      isDragDisabled={isSelectionMode || sortOption !== "manual"}
      isSelected={selectedFolderIds.has(item.id)}
      isSelectionMode={isSelectionMode}
      onDrag={drag}
      onLongPress={() => handleFolderLongPress(item.id)}
      onPress={() => handleFolderPress(item)}
    />
  );

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
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
            <Text style={styles.title}>Папки</Text>
          )}

          {isSelectionMode ? (
            <View style={styles.headerRightActions}>
              <TouchableOpacity
                activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
                disabled={selectedIds.length === 0}
                onPress={handleDeleteSelectedFolders}
                style={styles.headerButton}
              >
                <Trash2
                  color={selectedIds.length > 0 ? "#EF4444" : "#555"}
                  size={26}
                />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={selectedIds.length > 0 ? 0.75 : 1}
                disabled={selectedIds.length === 0}
                onPress={handleMoveSelectedFolders}
                style={styles.headerButton}
              >
                <FolderInput
                  color={selectedIds.length > 0 ? "#3B82F6" : "#555"}
                  size={26}
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


        <View style={styles.searchContainer}>
          <SearchBar
            onChangeText={search.setQuery}
            placeholder="Пошук папок та збережених в них нотаток"
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
          <DraggableFlatList
            activationDistance={8}
            animationConfig={{
              damping: 22,
              mass: 0.25,
              overshootClamping: true,
              stiffness: 250,
            }}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 110 },
            ]}
            data={folders}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Поки що немає папок</Text>
                <Text style={styles.emptyText}>
                  Створіть папку, щоб упорядкувати нотатки.
                </Text>
              </View>
            }
            onDragEnd={handleDragEnd}
            onRefresh={reloadFolders}
            refreshing={isLoading}
            renderItem={renderFolder}
          />
        )}

        {!isSelectionMode && !search.hasQuery ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenCreateModal}
            style={[styles.fabContainer, { bottom: insets.bottom + 4 }]}
          >
            <View style={styles.fab}>
              <FolderPlus color="#FFF" size={28} />
            </View>
          </TouchableOpacity>
        ) : null}

        <CreateFolderModal
          folderTitle={folderTitle}
          onChangeTitle={setFolderTitle}
          onClose={closeCreateModal}
          onCreate={handleCreateFolder}
          visible={isCreateModalVisible}
        />

        <SortMenu
          currentValue={sortOption}
          onClose={() => setIsSortMenuVisible(false)}
          onSelect={updateGlobalSort}
          showManual={true}
          showUseGlobal={false}
          visible={isSortMenuVisible}
        />

        <ConfirmDialog
          confirmLabel="Видалити"
          isDestructive
          message={`Видалити ${selectedIds.length} вибраних папок?`}
          onCancel={() => setIsDeleteDialogVisible(false)}
          onConfirm={handleConfirmDeleteSelectedFolders}
          title="Видалити папки?"
          visible={isDeleteDialogVisible}
        />

        <MoveDialog
          excludedFolderIds={moveDialogExcludedFolderIds}
          folders={allFolders}
          mode="folder"
          onClose={() => setIsMoveDialogVisible(false)}
          onConfirm={handleConfirmMoveSelectedFolders}
          selectedCount={selectedIds.length}
          visible={isMoveDialogVisible}
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
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
  },
  headerButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  searchResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
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
});
