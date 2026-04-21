import { Module } from '@nestjs/common';
import { PaymentsGrpcController } from './payments.grpc.controller';
import { PaymentsGrpcService } from './payments.grpc.service';
import { ConfigModule } from '@nestjs/config';
import paymentsServiceConfig from '../config/payments-service.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      skipProcessEnv: true,
      load: [paymentsServiceConfig],
    }),
  ],
  controllers: [PaymentsGrpcController],
  providers: [PaymentsGrpcService],
})
export class PaymentsGrpcModule {}
