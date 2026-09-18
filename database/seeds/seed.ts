import dataSource from '../data-source';
import { Book } from '../../apps/books-service/src/books/entities/book.entity';

const books: Array<Partial<Book>> = [
  {
    title: 'Distributed Systems Fundamentals',
    author: 'Alex Morgan',
    isbn: '9780000000001',
    description: 'An introduction to distributed application design.',
    price: '39.99',
    availableQuantity: 20,
    soldQuantity: 0,
    isActive: true,
  },
  {
    title: 'Practical NestJS',
    author: 'Jordan Lee',
    isbn: '9780000000002',
    description: 'Build maintainable server-side TypeScript applications.',
    price: '44.50',
    availableQuantity: 15,
    soldQuantity: 0,
    isActive: true,
  },
];

async function seed(): Promise<void> {
  await dataSource.initialize();

  try {
    await dataSource.getRepository(Book).upsert(books, {
      conflictPaths: ['isbn'],
      skipUpdateIfNoValuesChanged: true,
    });
  } finally {
    await dataSource.destroy();
  }
}

void seed();
