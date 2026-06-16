/**
 * Модальне меню вибору напрямку та поля сортування.
 * Надає список доступних опцій сортування (за назвою, датою) для швидкого впорядкування списку нотаток.
 */
import type { SortOption } from "@/features/notes/types/note";
import { Check } from "lucide-react-native";
import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface SortMenuProps {
  visible: boolean;
  onClose: () => void;
  currentValue: SortOption | null;
  onSelect: (value: SortOption | null) => void | Promise<void>;
  showManual?: boolean;
  showUseGlobal?: boolean;
}

export const SortMenu: React.FC<SortMenuProps> = ({
  visible,
  onClose,
  currentValue,
  onSelect,
  showManual = false,
  showUseGlobal = false,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
              <View style={styles.dragIndicator} />
              <Text style={styles.title}>Сортування</Text>

              {showUseGlobal && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect(null);
                    onClose();
                  }}
                  style={[
                    styles.row,
                    currentValue === null && styles.rowActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rowText,
                      currentValue === null && styles.rowTextActive,
                    ]}
                  >
                    Використовувати глобальне налаштування
                  </Text>
                  {currentValue === null && <Check color="#3B82F6" size={20} />}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  onSelect("title_asc");
                  onClose();
                }}
                style={[
                  styles.row,
                  currentValue === "title_asc" && styles.rowActive,
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    currentValue === "title_asc" && styles.rowTextActive,
                  ]}
                >
                  За назвою (А-Я)
                </Text>
                {currentValue === "title_asc" && (
                  <Check color="#3B82F6" size={20} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  onSelect("created_at_desc");
                  onClose();
                }}
                style={[
                  styles.row,
                  currentValue === "created_at_desc" && styles.rowActive,
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    currentValue === "created_at_desc" && styles.rowTextActive,
                  ]}
                >
                  За датою створення
                </Text>
                {currentValue === "created_at_desc" && (
                  <Check color="#3B82F6" size={20} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  onSelect("updated_at_desc");
                  onClose();
                }}
                style={[
                  styles.row,
                  currentValue === "updated_at_desc" && styles.rowActive,
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    currentValue === "updated_at_desc" && styles.rowTextActive,
                  ]}
                >
                  За датою редагування
                </Text>
                {currentValue === "updated_at_desc" && (
                  <Check color="#3B82F6" size={20} />
                )}
              </TouchableOpacity>

              {showManual && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelect("manual");
                    onClose();
                  }}
                  style={[
                    styles.row,
                    currentValue === "manual" && styles.rowActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.rowText,
                      currentValue === "manual" && styles.rowTextActive,
                    ]}
                  >
                    Вручну (перетягування)
                  </Text>
                  {currentValue === "manual" && (
                    <Check color="#3B82F6" size={20} />
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.75}
                onPress={onClose}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Скасувати</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: "#333",
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#555",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#252525",
  },
  rowActive: {
    backgroundColor: "#202A3A",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  rowText: {
    color: "#DDD",
    fontSize: 16,
    fontWeight: "600",
  },
  rowTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  cancelButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
