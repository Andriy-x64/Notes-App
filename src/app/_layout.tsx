/**
 * Кореневий макет (Root Layout) всього додатка.
 * Ініціалізує DI, налаштовує обробку взаємодії зі сповіщеннями,
 * викликає reconcileRemindersOnAppStart() під час старту та задає root navigation.
 */
import { initializeDI } from "@/core/di/init";
import { reconcileRemindersOnAppStart } from "@/features/reminders/services/reminder-service";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Ініціалізація впровадження залежностей
initializeDI();

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Handle notification interaction while app is in foreground/background (warm start)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const noteId = response.notification.request.content.data?.noteId;
        if (noteId) {
          router.push(`/note/${noteId}`);
        }
      },
    );

    // 2. Handle notification interaction when app was closed (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const noteId = response?.notification.request.content.data?.noteId;
      if (noteId) {
        router.push(`/note/${noteId}`);
      }
    });

    // 3. Перевіряємо активні нагадування і відновлюємо ті, що є в БД, але відсутні в ОС
    reconcileRemindersOnAppStart().catch((error) => {
      console.warn("Failed to reconcile reminders:", error);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#121212" },
            animation: "fade_from_bottom",
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="folder/[id]" />
          <Stack.Screen name="note/[id]" />
          <Stack.Screen name="reminders/create" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
