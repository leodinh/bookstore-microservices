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
      get: { cmd: 'books.book.get' },
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
