import { Injectable } from '@nestjs/common';
import { CatalogBook } from '../interfaces/catalog-book.interface';
import { BooksRepository } from '../repositories/books.repository';

@Injectable()
export class BooksService {
  constructor(private readonly booksRepository: BooksRepository) {}

  async getCatalog(): Promise<CatalogBook[]> {
    const books = await this.booksRepository.findActiveCatalog();

    return books.map((book) => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      price: book.price,
      availableQuantity: book.availableQuantity,
      available: book.availableQuantity > 0,
    }));
  }
}
