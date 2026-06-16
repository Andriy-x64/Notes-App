/**
 * Екран списку всіх нагадувань.
 * Дозволяє користувачеві бачити всі заплановані нагадування, розділені за статусом виконання.
 */
import { ReminderCard } from "@/features/reminders/components/reminder-card";
import { useRemindersScreen } from "@/features/reminders/hooks/use-reminders-screen";
import { ConfirmDialog, ErrorDialog } from "@/shared/ui/dialogs";
import { Bell, Plus } from "lucide-react-native";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type FilterType = "all" | "completed" | "overdue" | "scheduled";

export function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const {
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
  } = useRemindersScreen();

  const filters: { type: FilterType; label: string }[] = [
    { type: "all", label: "Усі" },
    { type: "scheduled", label: "Заплановані" },
    { type: "completed", label: "Виконані" },
    { type: "overdue", label: "Прострочені" },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.safeContainer}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Нагадування</Text>
        </View>

        <View style={styles.filterWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filters}
            keyExtractor={(item) => item.type}
            renderItem={({ item }) => {
              const isActive = filter === item.type;
              return (
                <TouchableOpacity
                  onPress={() => setFilter(item.type)}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                >
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterScroll}
          />
        </View>

        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReminderCard
              expired={isOverdue(item)}
              isCompleted={item.is_completed === 1}
              item={item}
              onDelete={() => handleDelete(item)}
              onPress={() => handleCardPress(item)}
              onToggleComplete={() => handleToggleComplete(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Bell color="#444" size={64} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>Немає нагадувань</Text>
              <Text style={styles.emptySubtitle}>
                {"Тут з'являться ваші майбутні сповіщення для важливих нотаток"}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/reminders/create")}
                style={styles.emptyButton}
              >
                <Plus color="#FFF" size={18} />
                <Text style={styles.emptyButtonText}>Створити нагадування</Text>
              </TouchableOpacity>
            </View>
          }
        />

        <TouchableOpacity
          onPress={() => router.push("/reminders/create")}
          style={[styles.fab, { bottom: insets.bottom + 4 }]}
        >
          <Plus color="#FFF" size={28} />
        </TouchableOpacity>

        <ConfirmDialog
          confirmLabel="Видалити"
          isDestructive
          message="Це також видалить пов'язану нотатку."
          onCancel={() => setReminderToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Видалити нагадування?"
          visible={reminderToDelete !== null}
        />

        <ErrorDialog
          message={errorMessage ?? ""}
          onClose={() => setErrorMessage(null)}
          title="Помилка"
          visible={errorMessage !== null}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFF",
  },
  filterWrapper: {
    height: 48,
    marginBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    color: "#888",
    fontSize: 14,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
