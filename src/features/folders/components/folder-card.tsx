/**
 * Компонент картки папки у списку.
 * Відображає назву папки, кількість нотаток у ній та підтримує дії керування через довге натискання.
 */
import { CheckSquare, Folder, GripVertical, Square } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Folder as FolderModel } from "@/features/folders/types/folder";

interface FolderCardProps {
  folder: FolderModel;
  isDragActive: boolean;
  isDragDisabled: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onDrag: () => void;
  onLongPress: () => void;
  onPress: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  isDragActive,
  isDragDisabled,
  isSelected,
  isSelectionMode,
  onDrag,
  onLongPress,
  onPress,
}) => {
  const selectionOpacity = useRef(new Animated.Value(isSelectionMode ? 1 : 0)).current;
  const safeTitle = folder.title.trim() || "Untitled Folder";

  useEffect(() => {
    Animated.timing(selectionOpacity, {
      toValue: isSelectionMode ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isSelectionMode, selectionOpacity]);

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={isDragActive ? undefined : onLongPress}
      onPress={onPress}
      style={[styles.container, isSelected && styles.selectedContainer, isDragActive && styles.dragActiveContainer]}
    >
      <View style={styles.iconContainer}>
        <Folder color="#3B82F6" size={24} />
      </View>

      <Text numberOfLines={1} style={styles.title}>
        {safeTitle}
      </Text>

      <View style={styles.trailingSlot}>
        <TouchableOpacity
          accessibilityLabel={`Reorder ${safeTitle}`}
          activeOpacity={0.7}
          disabled={isDragDisabled}
          onPressIn={isDragDisabled ? undefined : onDrag}
          style={[
            styles.trailingIconLayer,
            styles.dragHandleLayer,
            isDragDisabled && styles.disabledDragHandle,
          ]}
        >
          <Animated.View style={{ opacity: Animated.subtract(1, selectionOpacity) }}>
            <GripVertical color="#888" size={22} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View
          pointerEvents="none"
          style={[styles.trailingIconLayer, { opacity: selectionOpacity }]}
        >
          {isSelected ? (
            <CheckSquare color="#3B82F6" size={22} strokeWidth={2.4} />
          ) : (
            <Square color="#888" size={22} strokeWidth={2.2} />
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 72,
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  selectedContainer: {
    borderColor: "#3B82F6",
    backgroundColor: "#202A3A",
  },
  dragActiveContainer: {
    opacity: 0.92,
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#252525",
  },
  title: {
    flex: 1,
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },
  trailingSlot: {
    width: 40,
    height: 40,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  trailingIconLayer: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleLayer: {
    width: 40,
    height: 40,
  },
  dragHandle: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  disabledDragHandle: {
    opacity: 0.35,
  },
});
