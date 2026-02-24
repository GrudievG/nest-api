import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { FilesService } from '../files/files.service';
import { AuthUser } from '../auth/types';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly filesService: FilesService,
  ) {}

  async create(title: string, price: string): Promise<Product> {
    const product = this.productsRepository.create({ title, price });
    return this.productsRepository.save(product);
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) {
      return [];
    }

    return this.productsRepository.find({ where: { id: In(ids) } });
  }

  async findAll(): Promise<Product[]> {
    return this.productsRepository.find();
  }

  async setMainImage(productId: string, fileId: string, user: AuthUser) {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const file = await this.filesService.getReadyFileForProduct(fileId, user);
    product.mainImageFileId = file.id;
    await this.productsRepository.save(product);

    return {
      productId: product.id,
      mainImageFileId: file.id,
      imageUrl: this.filesService.buildPublicUrl(file.objectKey),
    };
  }
}
