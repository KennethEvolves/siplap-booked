import type { NotificationList } from '@shared/contracts';
import { NotificationsRepository } from '../domain/notifications.repository.js';

export class NotificationsUseCase {
  constructor(private readonly repository: NotificationsRepository) {}
  list(userId: string, query: NotificationList) {
    return this.repository.list(userId, query);
  }
  async markRead(userId: string, notificationId: string) {
    await this.repository.markRead(userId, notificationId);
    return { success: true };
  }
}
