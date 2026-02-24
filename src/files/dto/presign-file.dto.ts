import type { AllowedContentType, FileKind } from '../types';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignFileDto {
  @IsString()
  @IsNotEmpty()
  contentType: AllowedContentType;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(10 * 1024 * 1024) // 10 MB
  sizeBytes: number;

  @IsString()
  @IsNotEmpty()
  kind: FileKind;
}
