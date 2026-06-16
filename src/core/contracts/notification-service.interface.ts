/**
 * Інтерфейс сервісу локальних сповіщень.
 * Описує контракт для планування, скасування та запиту дозволів на показ системних сповіщень.
 */
export interface NotificationService {
  requestNotificationPermissions(): Promise<boolean>;
  ensureAndroidNotificationChannel(): Promise<void>;
  scheduleOSNotification(
    title: string,
    body: string,
    triggerAt: number,
    data: Record<string, any>
  ): Promise<string>;
  cancelOSNotification(notificationId: string): Promise<void>;
  getOSActiveScheduledNotifications(): Promise<string[]>;
}
