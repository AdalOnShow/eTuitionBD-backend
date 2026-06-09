import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GradeLevel } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateTutorProfileDto } from './dto/create-tutor-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private generateTokens(user: {
    id: string;
    email: string;
    role: string;
    name: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  private mapGradeLevel(gradeLevel: string): GradeLevel {
    const gradeMap: Record<string, GradeLevel> = {
      'Class 1': GradeLevel.CLASS_1,
      'Class 2': GradeLevel.CLASS_2,
      'Class 3': GradeLevel.CLASS_3,
      'Class 4': GradeLevel.CLASS_4,
      'Class 5': GradeLevel.CLASS_5,
      'Class 6': GradeLevel.CLASS_6,
      'Class 7': GradeLevel.CLASS_7,
      'Class 8': GradeLevel.CLASS_8,
      'Class 9': GradeLevel.CLASS_9,
      'Class 10': GradeLevel.CLASS_10,
      'Class 11': GradeLevel.CLASS_11,
      'Class 12': GradeLevel.CLASS_12,
    };

    return gradeMap[gradeLevel];
  }

  async createStudentProfile(
    userId: string,
    createStudentProfileDto: CreateStudentProfileDto,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingProfile = await this.prisma.studentProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        throw new ConflictException('Student profile already exists');
      }

      const profile = await this.prisma.studentProfile.create({
        data: {
          userId,
          phone: createStudentProfileDto.phone,
          address: createStudentProfileDto.address,
          gradeLevel: this.mapGradeLevel(createStudentProfileDto.gradeLevel),
          school: createStudentProfileDto.school,
        },
        select: {
          id: true,
          phone: true,
          address: true,
          gradeLevel: true,
          school: true,
        },
      });

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true, role: 'STUDENT' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      const { accessToken, refreshToken } = this.generateTokens(updatedUser);

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
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
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
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const existingProfile = await this.prisma.tutorProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        throw new ConflictException('Tutor profile already exists');
      }

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
        select: {
          id: true,
          bio: true,
          subjects: true,
          experience: true,
          education: true,
          hourlyRate: true,
          certifications: true,
        },
      });

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { profileComplete: true, role: 'TUTOR' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });

      const { accessToken, refreshToken } = this.generateTokens(updatedUser);

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
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
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
        username: true,
        role: true,
        profileComplete: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        googleId: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        profileComplete: true,
        isActive: true,
        isEmailVerified: true,
        avatarUrl: true,
        googleId: true,
        studentProfile: {
          select: {
            id: true,
            phone: true,
            address: true,
            gradeLevel: true,
            school: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        tutorProfile: {
          select: {
            id: true,
            bio: true,
            subjects: true,
            experience: true,
            education: true,
            hourlyRate: true,
            certifications: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found.`);
    }

    return user;
  }
}
