import { IsIn, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateStudentProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+8801[3-9]\d{8}$/, {
    message: 'Use a correct Bangladeshi phone number',
  })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'Grade level is required' })
  @IsIn(
    [
      'Class 1',
      'Class 2',
      'Class 3',
      'Class 4',
      'Class 5',
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
      'Class 11',
      'Class 12',
    ],
    { message: 'Invalid grade level' },
  )
  gradeLevel: string;

  @IsString()
  @IsNotEmpty({ message: 'School name is required' })
  school: string;
}
