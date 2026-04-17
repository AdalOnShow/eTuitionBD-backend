import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
export class RegisterUserDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  role: string;
}
