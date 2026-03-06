import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  readonly email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt limit
  password: string;
}
