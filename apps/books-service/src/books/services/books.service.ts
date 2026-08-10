import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import {
  BookResponse,
  CreateBookRequest,
  UpdateBookRequest,
} from '@app/common';
import { Book } from '../entities/book.entity';
import { CatalogBook } from '../interfaces/catalog-book.interface';
import { BooksRepository } from '../repositories/books.repository';

@Injectable()
export class BooksService {
  constructor(private readonly booksRepository: BooksRepository) {}

  async createBook(request: CreateBookRequest): Promise<BookResponse> {
    const isbn = this.normalizeIsbn(request.isbn);
    const existingBook = await this.booksRepository.findByIsbn(isbn);

    if (existingBook) {
      throw this.duplicateIsbnError();
    }

    try {
      const book = await this.booksRepository.create({
        title: request.title.trim(),
        author: request.author.trim(),
        isbn,
        description: request.description?.trim() || null,
        price: request.price.toFixed(2),
        availableQuantity: request.availableQuantity,
        soldQuantity: 0,
        isActive: true,
      });

      return this.toBookResponse(book);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw this.duplicateIsbnError();
      }
      throw error;
    }
  }

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

  async updateBook(request: UpdateBookRequest): Promise<BookResponse> {
    const book = await this.booksRepository.findById(request.id);

    if (!book) {
      throw this.bookNotFoundError();
    }

    if (!this.hasUpdates(request)) {
      throw new RpcException({
        statusCode: 400,
        code: 'INVALID_BOOK_UPDATE',
        message: 'At least one book field must be provided.',
      });
    }

    if (request.isbn !== undefined) {
      const isbn = this.normalizeIsbn(request.isbn);
      const existingBook = await this.booksRepository.findByIsbn(isbn);

      if (existingBook && existingBook.id !== book.id) {
        throw this.duplicateIsbnError();
      }
      book.isbn = isbn;
    }

    if (request.title !== undefined) {
      book.title = request.title.trim();
    }
    if (request.author !== undefined) {
      book.author = request.author.trim();
    }
    if (request.description !== undefined) {
      book.description = request.description?.trim() || null;
    }
    if (request.price !== undefined) {
      book.price = request.price.toFixed(2);
    }
    if (request.availableQuantity !== undefined) {
      book.availableQuantity = request.availableQuantity;
    }

    try {
      return this.toBookResponse(await this.booksRepository.save(book));
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw this.duplicateIsbnError();
      }
      throw error;
    }
  }

  async deactivateBook(id: string): Promise<BookResponse> {
    const book = await this.booksRepository.findById(id);

    if (!book) {
      throw this.bookNotFoundError();
    }

    book.isActive = false;
    return this.toBookResponse(await this.booksRepository.save(book));
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

  private toBookResponse(book: Book): BookResponse {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      price: book.price,
      availableQuantity: book.availableQuantity,
      soldQuantity: book.soldQuantity,
      isActive: book.isActive,
      createdAt: book.createdAt.toISOString(),
      updatedAt: book.updatedAt.toISOString(),
    };
  }

  private hasUpdates(request: UpdateBookRequest): boolean {
    return Object.keys(request).some((key) => key !== 'id');
  }

  private normalizeIsbn(isbn: string): string {
    return isbn.replaceAll('-', '').toUpperCase();
  }

  private bookNotFoundError(): RpcException {
    return new RpcException({
      statusCode: 404,
      code: 'BOOK_NOT_FOUND',
      message: 'The requested book was not found.',
    });
  }

  private duplicateIsbnError(): RpcException {
    return new RpcException({
      statusCode: 409,
      code: 'DUPLICATE_BOOK_ISBN',
      message: 'A book with this ISBN already exists.',
    });
  }

  private isUniqueViolation(error: unknown): error is { code: string } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === '23505'
    );
  }
}
