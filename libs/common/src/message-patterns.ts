export const MESSAGE_PATTERNS = {
  books: {
    catalog: {
      get: { cmd: 'books.catalog.get' },
    },
    book: {
      get: { cmd: 'books.book.get' },
    },
  },
} as const;
