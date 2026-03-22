import DataLoader from 'dataloader';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

export type AppLoaders = {
  userByIdLoader: DataLoader<string, User | null>;
  productByIdLoader: DataLoader<string, Product | null>;
  orderItemsByOrderIdLoader: DataLoader<string, OrderItem[]>;
  orderTotalByOrderIdLoader: DataLoader<string, string>;
};

export type GraphQLContext = {
  loaders: AppLoaders;
};
