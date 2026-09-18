import { RpcLoggingInterceptor } from '@app/common';
import { DatabaseModule } from '@app/database';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications/controllers/notifications.controller';
import { Notification } from './notifications/entities/notification.entity';
import { NotificationsRepository } from './notifications/repositories/notifications.repository';
import { NotificationsService } from './notifications/services/notifications.service';

@Module({
  imports: [DatabaseModule, TypeOrmModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    { provide: APP_INTERCEPTOR, useClass: RpcLoggingInterceptor },
  ],
})
export class NotificationsServiceModule {}
