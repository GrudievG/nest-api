import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CreateBaseEntities1770491913161 } from './src/migrations/1770491913161-CreateBaseEntities';
import { AddUserEmailUniqueIndex1770499624048 } from './src/migrations/1770499624048-AddUserEmailUniqueIndex';
import { AddProductTitleUniqueIndex1770500167736 } from './src/migrations/1770500167736-AddProductTitleUniqueIndex';
import { AddStockCheck1770569086913 } from './src/migrations/1770569086913-AddStockCheck';
import { AddOrderIndexes1770576093077 } from './src/migrations/1770576093077-AddOrderIndexes';

const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: [
    CreateBaseEntities1770491913161,
    AddUserEmailUniqueIndex1770499624048,
    AddProductTitleUniqueIndex1770500167736,
    AddStockCheck1770569086913,
    AddOrderIndexes1770576093077,
  ],
  synchronize: false,
});

export default appDataSource;
