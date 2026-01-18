import { registerAs } from '@nestjs/config';

const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
}));

export default appConfig;
