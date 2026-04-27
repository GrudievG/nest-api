import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CompleteUploadDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}
