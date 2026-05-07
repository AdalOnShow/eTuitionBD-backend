import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateTutorProfileDto } from './dto/create-tutor-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async createStudentProfile(
    userId: string,
    createStudentProfileDto: CreateStudentProfileDto,
  ) {
    try {
      // Check if user exists and is a student
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'STUDENT') {
        throw new UnauthorizedException(
          'Only students can create student profiles',
        );
      }

      // Check if profile already exists
      const existingProfile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        throw new ConflictException('Student profile already exists');
      }

      // Create student profile
      const profile = await this.prisma.studentProfile.create({
        data: {
          userId,
          phone: createStudentProfileDto.phone,
          address: createStudentProfileDto.address,
          gradeLevel: createStudentProfileDto.gradeLevel,
          school: createStudentProfileDto.school,
        },
      });

      // Update user profileComplete status
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true },
      });

      return {
        success: true,
        message: 'Student profile created successfully',
        data: {
          id: profile.id,
          phone: profile.phone,
          address: profile.address,
          gradeLevel: profile.gradeLevel,
          school: profile.school,
        },
      };
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create student profile');
    }
  }

  async createTutorProfile(
    userId: string,
    createTutorProfileDto: CreateTutorProfileDto,
  ) {
    try {
      // Check if user exists and is a tutor
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'TUTOR') {
        throw new UnauthorizedException(
          'Only tutors can create tutor profiles',
        );
      }

      // Check if profile already exists
      const existingProfile = await this.prisma.tutorProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        throw new ConflictException('Tutor profile already exists');
      }

      // Create tutor profile
      const profile = await this.prisma.tutorProfile.create({
        data: {
          userId,
          bio: createTutorProfileDto.bio,
          subjects: createTutorProfileDto.subjects,
          experience: createTutorProfileDto.experience,
          education: createTutorProfileDto.education,
          hourlyRate: createTutorProfileDto.hourlyRate,
          certifications: createTutorProfileDto.certifications,
        },
      });

      // Update user profileComplete status
      await this.prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true },
      });

      return {
        success: true,
        message: 'Tutor profile created successfully',
        data: {
          id: profile.id,
          bio: profile.bio,
          subjects: profile.subjects,
          experience: profile.experience,
          education: profile.education,
          hourlyRate: profile.hourlyRate,
          certifications: profile.certifications,
        },
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create tutor profile');
    }
  }

  async getProfileStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          profileComplete: true,
          role: true,
          studentProfile: {
            select: {
              id: true,
            },
          },
          tutorProfile: {
            select: {
              id: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        data: {
          profileComplete:
            (user as { profileComplete?: boolean }).profileComplete || false,
          role: user.role,
          hasStudentProfile: !!user.studentProfile,
          hasTutorProfile: !!user.tutorProfile,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to get profile status');
    }
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileComplete: true,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profileComplete: true,
        studentProfile: true,
        tutorProfile: true,
      },
    });
  }
}
