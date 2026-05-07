import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsInt,
  Min,
  Max,
  ArrayNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateTutorProfileDto {
  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one subject is required' })
  @IsString({ each: true })
  subjects: string[];

  @IsString()
  @IsNotEmpty({ message: 'Experience is required' })
  experience: string;

  @IsString()
  @IsNotEmpty({ message: 'Education is required' })
  education: string;

  @IsInt()
  @Min(100, { message: 'Hourly rate must be at least 100 BDT' })
  @Max(10000, { message: 'Hourly rate must not exceed 10,000 BDT' })
  hourlyRate: number;

  @IsString()
  @IsOptional()
  certifications?: string;
}
