import { registerAs } from '@nestjs/config';

const paymentsServiceConfig = registerAs('paymentsService', () => ({
  paymentsGRPCUrl: process.env.PAYMENTS_GRPC_URL,
  paymentsGRPCBindUrl: process.env.PAYMENTS_GRPC_BIND_URL,
  paymentsRPCTimeoutMs: process.env.PAYMENTS_RPC_TIMEOUT_MS,
  paymentsPRCMaxRetries: process.env.PAYMENTS_RPC_MAX_RETRIES,
  paymentsPRCBackoffMs: process.env.PAYMENTS_RPC_BACKOFF_MS,
}));

export default paymentsServiceConfig;
