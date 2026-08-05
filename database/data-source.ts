import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../apps/users-service/src/users/entities/user.entity';

export default new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://bookstore:bookstore@127.0.0.1:5433/bookstore',
  entities: [User],
  migrations: ['database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
