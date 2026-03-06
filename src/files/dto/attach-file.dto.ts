import { IsNotEmpty, IsString } from 'class-validator';

export class AttachFileDto {
  @IsString()
  @IsNotEmpty()
  fileId: string;
}
