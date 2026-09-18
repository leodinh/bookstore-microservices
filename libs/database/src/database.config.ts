import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export function createDatabaseOptions(
  databaseUrl: string,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true,
    synchronize: false,
  };
}
