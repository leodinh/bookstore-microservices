import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { BooksServiceController } from './books-service.controller';
import { BooksServiceService } from './books-service.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BooksServiceController],
  providers: [BooksServiceService],
})
export class BooksServiceModule {}
