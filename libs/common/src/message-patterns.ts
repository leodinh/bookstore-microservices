export const MESSAGE_PATTERNS = {
  users: {
    account: {
      get: { cmd: 'users.account.get' },
      signup: { cmd: 'users.account.signup' },
    },
  },
  books: {
    catalog: {
      get: { cmd: 'books.catalog.get' },
    },
    book: {
      create: { cmd: 'books.book.create' },
      deactivate: { cmd: 'books.book.deactivate' },
      get: { cmd: 'books.book.get' },
      update: { cmd: 'books.book.update' },
    },
  },
  orders: {
    order: {
      create: { cmd: 'orders.order.create' },
      get: { cmd: 'orders.order.get' },
    },
    user: {
      list: { cmd: 'orders.user.list' },
    },
  },
} as const;
