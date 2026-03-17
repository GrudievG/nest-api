import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { PaymentsGrpcModule } from './payments.grpc.module';
import { PAYMENTS_PACKAGE_NAME } from '../common/grpc.constants';

async function bootstrap() {
  const configService = new ConfigService();
  const url = configService.get<string>(
    'PAYMENTS_GRPC_BIND_URL',
    '0.0.0.0:5021',
  );
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
