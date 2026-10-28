import { Controller, Get, Param, ParseUUIDPipe, Patch, Query, Req, UseFilters, UseGuards } from '@nestjs/common';
import { notificationListSchema, type NotificationList } from '@shared/contracts';
import { JwtAuthGuard, type AuthenticatedUser } from '../../auth/presentation/jwt-auth.guard.js';
import { RbacExceptionFilter } from '../../common/presentation/rbac-exception.filter.js';
import { ZodValidationPipe } from '../../common/presentation/zod-validation.pipe.js';
import { NotificationsUseCase } from '../application/notifications.use-case.js';

type Request = { user: AuthenticatedUser };
@Controller(['notifications', 'api/notifications'])
@UseGuards(JwtAuthGuard)
@UseFilters(RbacExceptionFilter)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsUseCase) {}
  @Get()
  list(@Req() req: Request, @Query(new ZodValidationPipe(notificationListSchema)) query: NotificationList) {
    return this.notifications.list(req.user.sub, query);
  }
  @Patch(':notificationId/read')
  markRead(@Req() req: Request, @Param('notificationId', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(req.user.sub, id);
  }
}
