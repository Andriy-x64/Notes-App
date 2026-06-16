/**
 * Екран планування нагадування.
 * Надає повноекранний інтерфейс вибору часу для встановлення сповіщення до нотатки.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, Clock, Save } from "lucide-react-native";
import DatePicker from "react-native-date-picker";
import { createReminderWithNote, requestPermissions, scheduleReminder } from "../services/reminder-service";
import { ErrorDialog, InfoDialog } from "@/shared/ui/dialogs";
import { SafeAreaView } from "react-native-safe-area-context";

export function CreateReminderScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState<Date>(new Date(Date.now() + 5 * 60 * 1000)); // 5 mins in future
  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [isSuccessDialogVisible, setIsSuccessDialogVisible] = useState(false);

  // Стан вибору дати
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const handleOpenPicker = () => {
    setOpenDatePicker(true);
  };

  const handleSave = async () => {
    const safeTitle = title.trim();
    const safeDescription = description.trim();

    if (!safeTitle) {
      setTitleError("Будь ласка, введіть назву нагадування");
      return;
    }

    if (dateTime.getTime() <= Date.now()) {
      setDateError("Час нагадування має бути в майбутньому");
      return;
    }

    // 1. Запитуємо дозволи на сповіщення
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setDialogError(
        "Для отримання нагадувань увімкніть сповіщення у системних налаштуваннях вашого пристрою."
      );
      return;
    }

    try {
      // 2. Зберігаємо нотатку та запис нагадування в SQLite
      const { noteId } = await createReminderWithNote(safeTitle, safeDescription, dateTime.getTime());

      // 3. Плануємо системне сповіщення та оновлюємо деталі нагадування
      await scheduleReminder(noteId, safeTitle, safeDescription || "Нагадування", dateTime.getTime());

      setIsSuccessDialogVisible(true);
    } catch (error: any) {
      setDialogError(error.message || "Не вдалося зберегти нагадування");
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Нове нагадування</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Назва завдання</Text>
            <TextInput
              value={title}
              onChangeText={(nextTitle) => {
                setTitle(nextTitle);
                setTitleError(null);
              }}
              placeholder="Введіть назву..."
              placeholderTextColor="#555"
              style={[styles.input, titleError ? styles.inputError : null]}
            />
            {titleError ? (
              <Text selectable style={styles.validationText}>
                {titleError}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Короткий опис</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Додайте деталі..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={4}
              style={[styles.input, styles.multilineInput]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Час спрацьовування</Text>
            <TouchableOpacity
              onPress={handleOpenPicker}
              style={[
                styles.dateTimeSelector,
                dateError ? styles.inputError : null,
              ]}
            >
              <View style={styles.dateTimeInfo}>
                <Calendar color="#3B82F6" size={20} />
                <Text style={styles.dateTimeText}>
                  {dateTime.toLocaleString("uk-UA", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.dateTimeInfo}>
                <Clock color="#3B82F6" size={20} />
                <Text style={styles.dateTimeText}>
                  {dateTime.toLocaleString("uk-UA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
            {dateError ? (
              <Text selectable style={styles.validationText}>
                {dateError}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Save color="#FFF" size={20} />
            <Text style={styles.saveButtonText}>Зберегти нагадування</Text>
          </TouchableOpacity>
        </ScrollView>

        <DatePicker
          modal
          open={openDatePicker}
          date={dateTime}
          mode="datetime"
          theme="dark"
          locale="uk"
          title="Оберіть дату та час"
          confirmText="Підтвердити"
          cancelText="Скасувати"
          onConfirm={(date) => {
            setOpenDatePicker(false);
            setDateTime(date);
            setDateError(null);
          }}
          onCancel={() => {
            setOpenDatePicker(false);
          }}
        />

        <ErrorDialog
          message={dialogError ?? ""}
          onClose={() => setDialogError(null)}
          title="Помилка"
          visible={dialogError !== null}
        />

        <InfoDialog
          message="Нагадування збережено"
          onClose={() => {
            setIsSuccessDialogVisible(false);
            router.back();
          }}
          title="Успішно"
          visible={isSuccessDialogVisible}
        />
      </KeyboardAvoidingView>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFF",
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#FFF",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  validationText: {
    marginTop: 8,
    color: "#F87171",
    fontSize: 13,
    fontWeight: "700",
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  dateTimeSelector: {
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  dateTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateTimeText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});
