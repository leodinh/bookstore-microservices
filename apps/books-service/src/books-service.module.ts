import { Module } from '@nestjs/common';
import { BooksServiceController } from './books-service.controller';
import { BooksServiceService } from './books-service.service';

@Module({
  imports: [],
  controllers: [BooksServiceController],
  providers: [BooksServiceService],
})
export class BooksServiceModule {}
