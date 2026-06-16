/**
 * Головна точка входу для вкладки пошуку.
 * Відображає екран глобального пошуку нотаток за назвою та вмістом.
 */
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SearchBar } from "@/features/search/components/SearchBar";
import { SearchResultsList } from "@/features/search/components/SearchResultsList";
import { useSearch } from "@/features/search/hooks/useSearch";

export default function SearchScreen() {
  const search = useSearch("global");

  //Пошук
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          Пошук
        </Text>
      </View>
      <View style={styles.content}>
        <SearchBar
          onChangeText={search.setQuery}
          placeholder="Пошук нотаток та папок"
          value={search.query}
        />

        {search.hasQuery ? (
          <SearchResultsList
            error={search.error}
            isLoading={search.isLoading}
            results={search.results}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text selectable style={styles.emptyText}>
              Пошук нотаток та папок
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    color: "#888",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
});
