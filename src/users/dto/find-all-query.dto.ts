import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class FindAllQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  offset = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit = 20;
}