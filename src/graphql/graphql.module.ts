import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import {
  OrderItemsResolver,
  OrdersResolver,
} from './resolvers/orders.resolver';
import { OrdersModule } from '../orders/orders.module';
import { LoadersFactory } from './loaders/loaders.factory';
import { LoadersModule } from './loaders/loaders.module';

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LoadersModule],
      inject: [LoadersFactory],
      useFactory: (loadersFactory: LoadersFactory) => ({
        autoSchemaFile: true,
        graphiql: true,
        path: '/graphql',
        context: () => ({
          loaders: loadersFactory.create(),
        }),
      }),
    }),
    OrdersModule,
  ],
  providers: [OrdersResolver, OrderItemsResolver],
})
export class AppGraphqlModule {}
