/**
 * Компонент картки нагадування у списку.
 * Відображає інформацію про заплановане нагадування (час, прев'ю нотатки) та дозволяє відмітити його як виконане або видалити.
 */
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell, Trash2, Calendar, CheckSquare, Square } from "lucide-react-native";
import type { ReminderDbItem } from "@/core/types/reminder";
import { getNotePreview } from "@/features/notes/utils/get-note-preview";

interface ReminderCardProps {
  item: ReminderDbItem;
  isCompleted: boolean;
  expired: boolean;
  onPress: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
}

const formatDateTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("uk-UA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ReminderCard: React.FC<ReminderCardProps> = ({
  item,
  isCompleted,
  expired,
  onPress,
  onToggleComplete,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        isCompleted && styles.cardCompleted,
        expired && styles.cardOverdue,
      ]}
    >
      <View style={styles.cardHeader}>
        <TouchableOpacity
          onPress={onToggleComplete}
          style={styles.checkboxContainer}
        >
          {isCompleted ? (
            <CheckSquare color="#3B82F6" size={22} />
          ) : (
            <Square color={expired ? "#EF4444" : "#888"} size={22} />
          )}
        </TouchableOpacity>

        <Text
          numberOfLines={1}
          style={[
            styles.cardTitle,
            isCompleted && styles.textCompleted,
            expired && styles.textOverdue,
          ]}
        >
          {item.note_title || item.title_snapshot}
        </Text>

        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Trash2 color="#EF4444" size={20} />
        </TouchableOpacity>
      </View>

      <Text
        numberOfLines={2}
        style={[styles.cardDescription, isCompleted && styles.textCompleted]}
      >
        {getNotePreview(item.note_content ?? "")}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.timeContainer}>
          <Calendar color={isCompleted ? "#555" : expired ? "#EF4444" : "#93C5FD"} size={14} />
          <Text
            style={[
              styles.timeText,
              isCompleted && styles.textCompleted,
              expired && styles.timeTextOverdue,
            ]}
          >
            {formatDateTime(item.trigger_at)}
          </Text>
        </View>

        {isCompleted && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Виконано</Text>
          </View>
        )}

        {expired && (
          <View style={[styles.statusBadge, styles.statusBadgeOverdue]}>
            <Text style={[styles.statusBadgeText, styles.statusBadgeTextOverdue]}>
              Прострочено
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 16,
    marginBottom: 12,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardOverdue: {
    borderColor: "#5A2A2A",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkboxContainer: {
    marginRight: 10,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
  },
  textCompleted: {
    textDecorationLine: "line-through",
    color: "#888",
  },
  textOverdue: {
    color: "#EF4444",
  },
  deleteButton: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#BBB",
    lineHeight: 20,
    marginBottom: 12,
    paddingLeft: 32,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 32,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    color: "#93C5FD",
    fontWeight: "600",
  },
  timeTextOverdue: {
    color: "#EF4444",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#202A3A",
  },
  statusBadgeText: {
    fontSize: 11,
    color: "#3B82F6",
    fontWeight: "700",
  },
  statusBadgeOverdue: {
    backgroundColor: "#EF444420",
  },
  statusBadgeTextOverdue: {
    color: "#EF4444",
  },
});
