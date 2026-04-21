import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PaymentsGrpcModule } from './payments.grpc.module';
import { PAYMENTS_PACKAGE_NAME } from '../common/grpc.constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PaymentsGrpcModule);
  const configService = app.get(ConfigService);
  const url = configService.get<string>(
    'paymentsService.paymentsGRPCBindUrl',
    '0.0.0.0:5021',
  );
  await app.close();

  const grpc = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentsGrpcModule,
    {
      transport: Transport.GRPC,
      options: {
        package: PAYMENTS_PACKAGE_NAME,
        protoPath: join(process.cwd(), 'proto/payments.proto'),
        url,
      },
    },
  );

  await grpc.listen();
}

bootstrap();
