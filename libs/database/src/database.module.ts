import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createDatabaseOptions } from './database.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createDatabaseOptions(
          configService.get<string>('DATABASE_URL') ??
            'postgresql://bookstore:bookstore@127.0.0.1:5433/bookstore',
        ),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
