/**
 * Модальне вікно для створення нової папки.
 * Надає форму для введення назви папки та вибору батьківської папки у дереві ієрархії.
 */
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CreateFolderModalProps {
  visible: boolean;
  folderTitle: string;
  onChangeTitle: (title: string) => void;
  onClose: () => void;
  onCreate: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  visible,
  folderTitle,
  onChangeTitle,
  onClose,
  onCreate,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
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
          <Text style={styles.modalTitle}>Нова папка</Text>
          <TextInput
            autoFocus
            onChangeText={onChangeTitle}
            onSubmitEditing={onCreate}
            placeholder="Назва папки"
            placeholderTextColor="#777"
            returnKeyType="done"
            style={styles.input}
            value={folderTitle}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Скасувати</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={!folderTitle.trim()}
              onPress={onCreate}
              style={[
                styles.primaryButton,
                !folderTitle.trim() && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>Створити</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
});
