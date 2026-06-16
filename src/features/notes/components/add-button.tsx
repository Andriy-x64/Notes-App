/**
 * Плаваюча кнопка додавання нової нотатки.
 * Відображається на головному екрані та екранах папок для швидкого переходу до створення нотатки.
 */
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AddButtonProps {
  onPress: () => void;
}

export const AddButton: React.FC<AddButtonProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.container, { bottom: insets.bottom + 4 }]}
    >
      <View style={styles.fab}>
        <Plus color="#FFF" size={28} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
