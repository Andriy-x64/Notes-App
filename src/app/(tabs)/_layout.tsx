/**
 * Налаштування базового макету та навігації по вкладках (Tabs Layout) за допомогою Expo Router.
 * Визначає відображення нижнього меню (Tabs) з іконками та стилізацією для головних екранів додатка.
 */
import { Tabs } from "expo-router";
import { Bell, FileText, Folder, Search } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B82F6", // колір активної іконки та тексту
        tabBarInactiveTintColor: "#888", // колір неактивної іконки та тексту
        tabBarStyle: {
          backgroundColor: "#1E1E1E", // колір фону таб-бару
          borderTopColor: "#2A2A2A", // колір верхньої межі таб-бару
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Нотатки",
          tabBarIcon: ({ color, size }) => (
            <FileText color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Нагадування",
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Пошук",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="folders"
        options={{
          title: "Папки",
          tabBarIcon: ({ color, size }) => <Folder color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
