import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Book } from '../entities/book.entity';
import { CatalogBook } from '../interfaces/catalog-book.interface';
import { BooksRepository } from '../repositories/books.repository';

@Injectable()
export class BooksService {
  constructor(private readonly booksRepository: BooksRepository) {}

  async getCatalog(): Promise<CatalogBook[]> {
    const books = await this.booksRepository.findActiveCatalog();

    return books.map((book) => this.toCatalogBook(book));
  }

  async getBook(id: string): Promise<CatalogBook> {
    const book = await this.booksRepository.findActiveById(id);

    if (!book) {
      throw new RpcException({
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
        message: 'The requested book was not found.',
      });
    }

    return this.toCatalogBook(book);
  }

  private toCatalogBook(book: Book): CatalogBook {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      price: book.price,
      availableQuantity: book.availableQuantity,
      available: book.availableQuantity > 0,
    };
  }
}
