import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  readonly firstName!: string;

  @IsString()
  @MinLength(2)
  readonly lastName!: string;

  @IsInt()
  readonly age: number;
}
