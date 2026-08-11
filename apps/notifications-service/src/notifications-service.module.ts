import { RpcLoggingInterceptor } from '@app/common';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { NotificationsController } from './notifications/controllers/notifications.controller';
import { NotificationsService } from './notifications/services/notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: APP_INTERCEPTOR, useClass: RpcLoggingInterceptor },
  ],
})
export class NotificationsServiceModule {}
