import 'dotenv/config';
import { DataSource } from 'typeorm';
import { CreateBaseEntities1770491913161 } from './migrations/1770491913161-CreateBaseEntities';
import { AddUserEmailUniqueIndex1770499624048 } from './migrations/1770499624048-AddUserEmailUniqueIndex';
import { AddProductTitleUniqueIndex1770500167736 } from './migrations/1770500167736-AddProductTitleUniqueIndex';
import { AddStockCheck1770569086913 } from './migrations/1770569086913-AddStockCheck';
import { AddOrderIndexes1770576093077 } from './migrations/1770576093077-AddOrderIndexes';
import { AddUserPasswordHash1771603078887 } from './migrations/1771603078887-AddUserPasswordHash';
import { CreatePaymentEntity1771784004287 } from './migrations/1771784004287-CreatePaymentEntity';
import { CreateFileRecordEntity1771948499029 } from './migrations/1771948499029-CreateFileRecordEntity';
import { AddProductImageRelation1771966821516 } from './migrations/1771966821516-AddProductImageRelation';
import { CreateProcessedMessageEntity1773258734771 } from './migrations/1773258734771-CreateProcessedMessageEntity';
import { EnableUuidExtension1600000000000 } from './migrations/1600000000000-EnableUuidExtension';
import { ChangeOrderStatusEnum1776538008081 } from './migrations/1776538008081-ChangeOrderStatusEnum';
import { AddFileRecordEntityMetadata1777322013970 } from './migrations/1777322013970-AddFileRecordEntityMetadata';
import { AddProviderPaymentIdToPayment1777400000000 } from './migrations/1777400000000-AddProviderPaymentIdToPayment';

const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity.{js,ts}'],
  migrations: [
    EnableUuidExtension1600000000000,
    CreateBaseEntities1770491913161,
    AddUserEmailUniqueIndex1770499624048,
    AddProductTitleUniqueIndex1770500167736,
    AddStockCheck1770569086913,
    AddOrderIndexes1770576093077,
    AddUserPasswordHash1771603078887,
    CreatePaymentEntity1771784004287,
    CreateFileRecordEntity1771948499029,
    AddProductImageRelation1771966821516,
    CreateProcessedMessageEntity1773258734771,
    ChangeOrderStatusEnum1776538008081,
    AddFileRecordEntityMetadata1777322013970,
    AddProviderPaymentIdToPayment1777400000000,
  ],
  synchronize: false,
});

export default appDataSource;
