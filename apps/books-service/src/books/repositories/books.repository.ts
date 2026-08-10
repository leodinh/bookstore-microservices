import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../entities/book.entity';

export interface CreateBookRecord {
  title: string;
  author: string;
  isbn: string;
  description: string | null;
  price: string;
  availableQuantity: number;
  soldQuantity: number;
  isActive: boolean;
}

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

  findActiveById(id: string): Promise<Book | null> {
    return this.repository.findOne({
      where: { id, isActive: true },
    });
  }

  findById(id: string): Promise<Book | null> {
    return this.repository.findOne({ where: { id } });
  }

  findByIsbn(isbn: string): Promise<Book | null> {
    return this.repository.findOne({ where: { isbn } });
  }

  create(input: CreateBookRecord): Promise<Book> {
    return this.repository.save(this.repository.create(input));
  }

  save(book: Book): Promise<Book> {
    return this.repository.save(book);
  }
}
