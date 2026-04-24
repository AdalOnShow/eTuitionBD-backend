import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// DTO for creating a new user
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  role: string;
}
