import { registerAs } from '@nestjs/config';

const rabbitmqConfig = registerAs('rabbitmq', () => ({
  url: process.env.RABBITMQ_URL,
  prefetchCount: Number(process.env.RABBITMQ_PREFETCH) || 10,
}));

export default rabbitmqConfig;
