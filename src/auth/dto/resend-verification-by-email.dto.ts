import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class ResendVerificationByEmailDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
