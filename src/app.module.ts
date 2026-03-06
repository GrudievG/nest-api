import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import authConfig from './config/auth.config';
import awsConfig from './config/aws.config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { TypeOrmRequestContextLogger } from './common/utils/typeorm-logger';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { AppGraphqlModule } from './graphql/graphql.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      skipProcessEnv: true,
      load: [appConfig, databaseConfig, authConfig, awsConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow('database.host'),
        port: config.getOrThrow('database.port'),
        username: config.getOrThrow('database.username'),
        password: config.getOrThrow('database.password'),
        database: config.getOrThrow('database.name'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
        logging: ['query', 'error'],
        logger: new TypeOrmRequestContextLogger(),
      }),
    }),
    UsersModule,
    OrdersModule,
    ProductsModule,
    AppGraphqlModule,
    AuthModule,
    PaymentsModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: 'graphql', method: RequestMethod.ALL });
  }
}
