import { IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
