/**
 * Компонент-заглушка для порожнього списку нотаток.
 * Відображає інформаційну ілюстрацію та текст, коли в списку або за результатами пошуку немає жодної нотатки.
 */
import { NotebookPen } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

// Компонент для відображення порожнього стану, коли немає нотаток
export const EmptyState = () => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <NotebookPen color="#333" size={64} />
      </View>
      <Text style={styles.title}>Поки що немає нотаток</Text>
      <Text style={styles.subtitle}>
        Натисніть кнопку плюс, щоб створити свою першу нотатку.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: "30%",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1E1E1E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 22,
  },
});
