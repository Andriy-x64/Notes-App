/**
 * Заголовок діалогового вікна.
 * Відображає назву модального вікна у верхній його частині.
 */
import { StyleSheet, Text, View } from "react-native";

interface DialogHeaderProps {
  subtitle?: string;
  title: string;
}

export function DialogHeader({ subtitle, title }: DialogHeaderProps) {
  return (
    <View style={styles.container}>
      <Text selectable style={styles.title}>
        {title}
      </Text>
      {subtitle ? (
        <Text selectable style={styles.subtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#A3A3A3",
    fontSize: 14,
    lineHeight: 20,
  },
});
