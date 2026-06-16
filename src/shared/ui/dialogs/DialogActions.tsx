/**
 * Спільна панель кнопок дій для діалогових вікон.
 * Рендерить кнопки дій у нижній частині модальних вікон із можливістю налаштування обробників.
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

export interface DialogAction {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: "neutral" | "primary" | "destructive";
}

interface DialogActionsProps {
  actions: DialogAction[];
}

export function DialogActions({ actions }: DialogActionsProps) {
  return (
    <View style={styles.container}>
      {actions.map((action) => {
        const variant = action.variant ?? "neutral";

        return (
          <Pressable
            disabled={action.disabled}
            key={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.button,
              styles[variant],
              pressed ? styles.pressed : null,
              action.disabled ? styles.disabled : null,
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                variant === "destructive" ? styles.destructiveText : null,
                variant === "primary" ? styles.primaryText : null,
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  button: {
    minWidth: 92,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  neutral: {
    backgroundColor: "#252525",
  },
  primary: {
    backgroundColor: "#3B82F6",
  },
  destructive: {
    backgroundColor: "#3A1F1F",
    borderWidth: 1,
    borderColor: "#7F2D2D",
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#DDD",
    fontSize: 15,
    fontWeight: "800",
  },
  primaryText: {
    color: "#FFF",
  },
  destructiveText: {
    color: "#FCA5A5",
  },
});
