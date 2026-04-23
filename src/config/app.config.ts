import { registerAs } from '@nestjs/config';

const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000',
}));

export default appConfig;
