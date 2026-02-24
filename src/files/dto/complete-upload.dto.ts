import { IsNotEmpty, IsString } from 'class-validator';

export class CompleteUploadDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;
}
