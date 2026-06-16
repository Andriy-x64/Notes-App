/**
 * Реалізація сервісу сповіщень за допомогою бібліотеки expo-notifications.
 * Планує та видаляє локальні пуш-повідомлення в операційній системі пристрою.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationService } from "@/core/contracts/notification-service.interface";

// Налаштування поведінки сповіщень у активному режимі (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class ExpoNotificationService implements NotificationService {
  async requestNotificationPermissions(): Promise<boolean> {
    const settings = await Notifications.getPermissionsAsync();
    if (
      settings.granted ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    ) {
      return true;
    }
    const request = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
    return (
      request.granted ||
      request.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      request.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
    );
  }

  async ensureAndroidNotificationChannel(): Promise<void> {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  }

  async scheduleOSNotification(
    title: string,
    body: string,
    triggerAt: number,
    data: Record<string, any>
  ): Promise<string> {
    return Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(triggerAt),
      },
    });
  }

  async cancelOSNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async getOSActiveScheduledNotifications(): Promise<string[]> {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.map((item) => item.identifier);
  }
}
