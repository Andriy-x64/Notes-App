/**
 * Обгортка контейнера діалогового вікна.
 * Задає однакові відступи, колір фону та рамку для всіх типів модальних вікон додатка.
 */
import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

export function DialogContainer({ children }: PropsWithChildren) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 420,
    gap: 16,
    padding: 20,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
});
