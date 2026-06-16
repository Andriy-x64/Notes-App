/**
 * Компонент текстового тіла діалогового вікна.
 * Відображає опис або основне повідомлення всередині модального вікна.
 */
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

interface DialogBodyProps extends PropsWithChildren {
  message?: string;
}

export function DialogBody({ children, message }: DialogBodyProps) {
  if (children) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Text selectable style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  message: {
    color: "#D4D4D4",
    fontSize: 15,
    lineHeight: 22,
  },
});
