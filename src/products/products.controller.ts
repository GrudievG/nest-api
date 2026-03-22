import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ScopesGuard } from '../auth/scopes.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Scopes } from '../auth/scopes.decorator';
import { AuthUser } from '../auth/types';
import { AttachFileDto } from '../files/dto/attach-file.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  @Scopes('products:images:write')
  @Post(':id/images')
  setProductImage(
    @Param('id') productId: string,
    @Req() req: Request & { user?: AuthUser },
    @Body() body: AttachFileDto,
  ) {
    return this.productsService.setMainImage(
      productId,
      body.fileId,
      req.user as AuthUser,
    );
  }
}
