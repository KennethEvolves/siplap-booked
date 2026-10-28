import { z } from 'zod';

export const notificationListSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});
export type NotificationList = z.infer<typeof notificationListSchema>;
export interface UserNotification {
  notificationId: string;
  activityId: string | null;
  reservationId: string | null;
  title: string;
  message: string;
  type: string | null;
  isRead: boolean;
  createdAt: string;
}
