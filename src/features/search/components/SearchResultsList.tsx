/**
 * Компонент списку результатів пошуку.
 * Відображає знайдені нотатки з підсвічуванням збігів або показує стан порожнього результату.
 */
import { useRouter, type Href } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { SearchResultItem } from "@/features/search/types/search-result";

interface SearchResultsListProps {
  error: Error | null;
  isLoading: boolean;
  results: SearchResultItem[];
}

const getTypeLabel = (type: SearchResultItem["type"]) => {
  return type === "folder" ? "\uD83D\uDCC1 Папка" : "\uD83D\uDCDD Нотатка";
};

const renderSnippet = (snippet: string) => {
  const parts = snippet.split(/(<b>.*?<\/b>)/g);
  return (
    <Text numberOfLines={2} selectable style={styles.snippet}>
      {parts.map((part, index) => {
        if (part.startsWith("<b>") && part.endsWith("</b>")) {
          return (
            <Text key={index} style={styles.boldHighlight}>
              {part.slice(3, -4)}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

export function SearchResultsList({
  error,
  isLoading,
  results,
}: SearchResultsListProps) {
  const router = useRouter();

  const handlePress = (item: SearchResultItem) => {
    if (item.type === "folder") {
      router.push(`/folder/${item.id}` as Href);
      return;
    }

    router.push(`/note/${item.id}` as Href);
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.stateContainer}>
          <Text selectable style={styles.stateText}>
            Пошук...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Text selectable style={styles.errorText}>
            Не вдалося виконати пошук
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.stateContainer}>
        <Text selectable style={styles.stateText}>
          Нічого не знайдено
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={results}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => `${item.type}:${item.id}`}
      ListEmptyComponent={renderEmptyState}
      renderItem={({ item }) => (
        <Pressable
          android_ripple={{ color: "#333" }}
          onPress={() => handlePress(item)}
          style={({ pressed }) => [
            styles.item,
            pressed ? styles.pressedItem : null,
          ]}
        >
          <Text selectable style={styles.typeLabel}>
            {getTypeLabel(item.type)}
          </Text>
          <Text numberOfLines={1} selectable style={styles.title}>
            {item.title}
          </Text>
          {item.snippet ? renderSnippet(item.snippet) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 110,
  },
  item: {
    gap: 6,
    padding: 16,
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#303030",
    marginBottom: 10,
  },
  pressedItem: {
    opacity: 0.78,
  },
  typeLabel: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  snippet: {
    color: "#B8B8B8",
    fontSize: 14,
    lineHeight: 20,
  },
  boldHighlight: {
    fontWeight: "bold",
    color: "#FFF",
  },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  stateText: {
    color: "#A0A0A0",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#F87171",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
});
