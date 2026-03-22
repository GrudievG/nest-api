import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { FilesModule } from '../files/files.module';
import { ProductsController } from './products.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), FilesModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
