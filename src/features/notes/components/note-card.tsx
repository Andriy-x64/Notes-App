/**
 * Компонент картки нотатки у списку.
 * Відображає назву, прев'ю тексту, дату оновлення та статус закріплення нотатки з підтримкою мультивибору.
 */
import { Calendar, CheckSquare, Pin, Square, Bell } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import type { Note } from "@/features/notes/types/note";
import { formatNoteDate } from "@/features/notes/utils/note-formatters";
import { getNotePreview } from "@/features/notes/utils/get-note-preview";
import { getReminderForNote } from "@/features/reminders/services/reminder-service";

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onLongPress?: () => void;
  onPress: () => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  isSelected = false,
  isSelectionMode = false,
  onLongPress,
  onPress,
}) => {
  const selectionOpacity = useRef(new Animated.Value(isSelectionMode ? 1 : 0)).current;
  const [hasReminder, setHasReminder] = useState(false);
  
  const hasTitle = typeof note.title === "string" && note.title.trim().length > 0;
  const preview = getNotePreview(note.contentPlain ?? "");

  useEffect(() => {
    Animated.timing(selectionOpacity, {
      toValue: isSelectionMode ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isSelectionMode, selectionOpacity]);

  useEffect(() => {
    let isMounted = true;
    const checkReminder = async () => {
      const activeReminder = await getReminderForNote(note.id);
      if (isMounted) {
        setHasReminder(
          !!activeReminder && 
          activeReminder.isCompleted === 0 && 
          activeReminder.triggerAt > Date.now()
        );
      }
    };
    checkReminder();
    return () => {
      isMounted = false;
    };
  }, [note]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.container}
    >
      <View style={[styles.card, isSelected && styles.selectedCard]}>
        {hasTitle ? (
          <>
            <Text numberOfLines={1} style={styles.title}>
              {note.title}
            </Text>
            <Text numberOfLines={2} style={styles.content}>
              {preview}
            </Text>
          </>
        ) : (
          <Text numberOfLines={3} style={styles.content}>
            {preview}
          </Text>
        )}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {note.isPinned && (
              <Pin color="#3B82F6" size={12} style={styles.pinIcon} />
            )}
            {hasReminder && (
              <Bell color="#93C5FD" size={12} style={styles.bellIcon} />
            )}
            <Calendar color="#888" size={12} />
            <Text style={styles.date}>{formatNoteDate(note.updatedAt)}</Text>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.selectionSlot, { opacity: selectionOpacity }]}
          >
            {isSelected ? (
              <CheckSquare color="#3B82F6" size={20} strokeWidth={2.4} />
            ) : (
              <Square color="#888" size={20} strokeWidth={2.2} />
            )}
          </Animated.View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    backgroundColor: "#202A3A",
    borderColor: "#3B82F6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: "#BBB",
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  selectionSlot: {
    width: 24,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  pinIcon: {
    marginRight: 2,
    transform: [{ rotate: "45deg" }],
  },
  bellIcon: {
    marginRight: 2,
  },
});
