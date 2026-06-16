/**
 * Компонент текстового поля пошуку.
 * Відображає інпут для введення пошукового запиту з кнопкою швидкого очищення тексту.
 */
import { Search, X } from "lucide-react-native";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface SearchBarProps {
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}

export function SearchBar({
  onChangeText,
  placeholder = "Search",
  value,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Search color="#8A8A8A" size={20} />
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777"
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
      {value.length > 0 ? (
        <TouchableOpacity
          accessibilityLabel="Clear search"
          activeOpacity={0.75}
          onPress={() => onChangeText("")}
          style={styles.clearButton}
        >
          <X color="#CFCFCF" size={18} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  input: {
    flex: 1,
    minHeight: 46,
    color: "#FFF",
    fontSize: 16,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2B2B2B",
  },
});
