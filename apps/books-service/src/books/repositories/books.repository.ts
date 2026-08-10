import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';

@Injectable()
export class BooksRepository {
  constructor(
    @InjectRepository(Book)
    private readonly repository: Repository<Book>,
  ) {}

  findActiveCatalog(): Promise<Book[]> {
    return this.repository.find({
      where: { isActive: true },
      order: { title: 'ASC' },
    });
  }
}
