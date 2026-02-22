import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt limit
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  readonly firstName!: string;

  @IsString()
  @MinLength(2)
  readonly lastName!: string;
}
