/**
 * Хук стану та логіки екрана управління папками.
 * Обробляє вибір папок, навігацію деревом папок, операції видалення, перейменування та сортування папок.
 */
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { BackHandler } from "react-native";
import type { Folder } from "../types/folder";
import { useFolders } from "./use-folders";
import { useAllFolders } from "./use-all-folders";
import { useFoldersStore } from "../store/folders-store";
import { getFolderDescendantIds } from "../utils/folder-tree";
import { useSearch } from "@/features/search/hooks/useSearch";
import { useSort } from "@/features/sorting/hooks/useSort";

export const useFoldersScreenState = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const {
    addFolder,
    deleteFolders,
    folders,
    isLoading,
    reloadFolders,
    reorderFolders,
  } = useFolders();

  const [folderTitle, setFolderTitle] = useState("");
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    () => new Set()
  );
  const [isSortMenuVisible, setIsSortMenuVisible] = useState(false);
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);
  const [isMoveDialogVisible, setIsMoveDialogVisible] = useState(false);

  const { folders: allFolders } = useAllFolders();
  const moveFolders = useFoldersStore((state) => state.moveFolders);

  const { sortOption, updateGlobalSort } = useSort(null);
  const search = useSearch("folders_root");

  const selectedIds = useMemo(
    () => Array.from(selectedFolderIds),
    [selectedFolderIds]
  );

  const moveDialogExcludedFolderIds = useMemo(() => {
    if (selectedIds.length === 0) {
      return [];
    }

    const descendantIds = getFolderDescendantIds(allFolders, selectedIds);
    return Array.from(new Set([...selectedIds, ...descendantIds]));
  }, [allFolders, selectedIds]);

  const closeSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedFolderIds(new Set());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadFolders();
    }, [reloadFolders])
  );

  useFocusEffect(
    useCallback(() => {
      const handleBackPress = () => {
        if (!isSelectionMode) {
          return false;
        }
        closeSelectionMode();
        return true;
      };

      const unsubscribeBackHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBackPress
      );

      const unsubscribeBeforeRemove = navigation.addListener(
        "beforeRemove",
        (event) => {
          if (!isSelectionMode) {
            return;
          }
          event.preventDefault();
          closeSelectionMode();
        }
      );

      return () => {
        unsubscribeBackHandler.remove();
        unsubscribeBeforeRemove();
      };
    }, [closeSelectionMode, isSelectionMode, navigation])
  );

  const closeCreateModal = () => {
    setFolderTitle("");
    setIsCreateModalVisible(false);
  };

  const handleCreateFolder = async () => {
    const safeTitle = folderTitle.trim();
    if (!safeTitle) {
      return;
    }
    await addFolder(safeTitle);
    closeCreateModal();
  };

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds((previousIds) => {
      const nextIds = new Set(previousIds);
      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }
      return nextIds;
    });
  };

  const handleFolderPress = (folder: Folder) => {
    if (isSelectionMode) {
      toggleFolderSelection(folder.id);
      return;
    }

    router.push({
      params: { id: folder.id },
      pathname: "/folder/[id]",
    } as unknown as Href);
  };

  const handleFolderLongPress = (id: string) => {
    if (isDragging) {
      return;
    }
    Haptics.selectionAsync();
    setIsSelectionMode(true);
    setSelectedFolderIds((previousIds) => {
      const nextIds = new Set(previousIds);
      nextIds.add(id);
      return nextIds;
    });
  };

  const handleDeleteSelectedFolders = () => {
    if (selectedIds.length > 0) {
      setIsDeleteDialogVisible(true);
    }
  };

  const handleConfirmDeleteSelectedFolders = async () => {
    await deleteFolders(selectedIds);
    setSelectedFolderIds(new Set());
    setIsSelectionMode(false);
    setIsDeleteDialogVisible(false);
  };

  const handleMoveSelectedFolders = () => {
    if (selectedIds.length > 0) {
      setIsMoveDialogVisible(true);
    }
  };

  const handleConfirmMoveSelectedFolders = async (targetFolderId: string | null) => {
    await moveFolders(selectedIds, targetFolderId);
    setSelectedFolderIds(new Set());
    setIsSelectionMode(false);
    setIsMoveDialogVisible(false);
  };

  const handleOpenCreateModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsCreateModalVisible(true);
  };

  const handleDragEnd = ({ data }: { data: Folder[] }) => {
    setIsDragging(false);
    reorderFolders(data);
  };

  return {
    folders,
    allFolders,
    isLoading,
    reloadFolders,
    folderTitle,
    setFolderTitle,
    isCreateModalVisible,
    setIsCreateModalVisible,
    isDragging,
    setIsDragging,
    isSelectionMode,
    setIsSelectionMode,
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
    toggleFolderSelection,
    handleFolderPress,
    handleFolderLongPress,
    handleDeleteSelectedFolders,
    handleConfirmDeleteSelectedFolders,
    handleMoveSelectedFolders,
    handleConfirmMoveSelectedFolders,
    handleOpenCreateModal,
    handleDragEnd,
  };
};
