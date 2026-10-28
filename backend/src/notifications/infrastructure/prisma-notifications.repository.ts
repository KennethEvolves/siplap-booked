import { Injectable } from '@nestjs/common';
import type { NotificationList, UserNotification } from '@shared/contracts';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RbacError } from '../../common/domain/rbac.error.js';
import { NotificationsRepository } from '../domain/notifications.repository.js';

@Injectable()
export class PrismaNotificationsRepository extends NotificationsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async list(userId: string, query: NotificationList) {
    const where = { user_id: userId, ...(query.unreadOnly ? { is_read: false } : {}) };
    const [rows, total, unread] = await this.prisma.$transaction([
      this.prisma.notifications.findMany({
        where,
        select: { notification_id: true, activity_id: true, reservation_id: true, title: true, message: true, type: true, is_read: true, created_at: true },
        orderBy: [{ created_at: 'desc' }, { notification_id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.notifications.count({ where }),
      this.prisma.notifications.count({ where: { user_id: userId, is_read: false } }),
    ]);
    const notifications: UserNotification[] = rows.map((row) => ({
      notificationId: row.notification_id,
      activityId: row.activity_id,
      reservationId: row.reservation_id,
      title: row.title,
      message: row.message,
      type: row.type,
      isRead: row.is_read,
      createdAt: row.created_at.toISOString(),
    }));
    return { notifications, total, unread };
  }
  async markRead(userId: string, notificationId: string) {
    const result = await this.prisma.notifications.updateMany({
      where: { notification_id: notificationId, user_id: userId },
      data: { is_read: true },
    });
    if (!result.count) throw new RbacError('not_found', 'Notificación no encontrada');
  }
}
