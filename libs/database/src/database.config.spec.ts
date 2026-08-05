import { createDatabaseOptions } from './database.config';

describe('createDatabaseOptions', () => {
  it('uses migrations instead of automatic synchronization', () => {
    const options = createDatabaseOptions(
      'postgresql://bookstore:bookstore@localhost:5433/bookstore',
    );

    expect(options).toEqual(
      expect.objectContaining({
        type: 'postgres',
        synchronize: false,
        autoLoadEntities: true,
      }),
    );
  });
});
