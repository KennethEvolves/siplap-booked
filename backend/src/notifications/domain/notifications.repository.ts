import type { NotificationList, UserNotification } from '@shared/contracts';

export abstract class NotificationsRepository {
  abstract list(userId: string, query: NotificationList): Promise<{ notifications: UserNotification[]; total: number; unread: number }>;
  abstract markRead(userId: string, notificationId: string): Promise<void>;
}
