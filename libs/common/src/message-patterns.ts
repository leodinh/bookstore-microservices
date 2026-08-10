export const MESSAGE_PATTERNS = {
  users: {
    account: {
      signup: { cmd: 'users.account.signup' },
    },
  },
  books: {
    catalog: {
      get: { cmd: 'books.catalog.get' },
    },
    book: {
      get: { cmd: 'books.book.get' },
    },
  },
} as const;
