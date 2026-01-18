import { registerAs } from '@nestjs/config';

const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST,
}))