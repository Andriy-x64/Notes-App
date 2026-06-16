/**
 * Хук логіки та стану екрана списку нагадувань.
 * Керує завантаженням нагадувань, фільтрацією активних/завершених та операціями відмітки виконання чи видалення.
 */
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import type { ReminderDbItem } from "@/core/types/reminder";
import {
  getReminders,
  toggleReminderStatus,
  deleteReminderAndNote,
  markReminderCompleted,
} from "../services/reminder-service";

type FilterType = "all" | "completed" | "overdue" | "scheduled";

export const useRemindersScreen = () => {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>("all");
  const [reminders, setReminders] = useState<ReminderDbItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reminderToDelete, setReminderToDelete] =
    useState<ReminderDbItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const list = await getReminders(filter);
      setReminders(list);
    } catch (error) {
      console.warn("Failed to load reminders:", error);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleComplete = async (item: ReminderDbItem) => {
    try {
      const nextStatus = item.is_completed === 1 ? false : true;
      if (nextStatus) {
        await markReminderCompleted(item.note_id);
      } else {
        await toggleReminderStatus(item.note_id, false);
      }
      loadData();
    } catch (error: any) {
      setErrorMessage(error.message || "Не вдалося змінити статус");
    }
  };

  const handleDelete = (item: ReminderDbItem) => {
    setReminderToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!reminderToDelete) {
      return;
    }
    try {
      await deleteReminderAndNote(reminderToDelete.note_id);
      setReminderToDelete(null);
      loadData();
    } catch (error: any) {
      setErrorMessage(error.message || "Не вдалося видалити запис");
    }
  };

  const handleCardPress = (item: ReminderDbItem) => {
    router.push(`/note/${item.note_id}`);
  };

  const isOverdue = (item: ReminderDbItem) => {
    return item.is_completed === 0 && item.trigger_at < Date.now();
  };

  return {
    router,
    filter,
    setFilter,
    reminders,
    errorMessage,
    setErrorMessage,
    reminderToDelete,
    setReminderToDelete,
    handleToggleComplete,
    handleDelete,
    handleConfirmDelete,
    handleCardPress,
    isOverdue,
    loadData,
  };
};
