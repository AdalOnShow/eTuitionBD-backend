import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { CreateTutorProfileDto } from './dto/create-tutor-profile.dto';
import { ProfileService } from './profile.service';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@Controller('profile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('student')
  createStudentProfile(
    @Request() req: AuthenticatedRequest,
    @Body() createStudentProfileDto: CreateStudentProfileDto,
  ) {
    const userId = req.user.sub;
    return this.profileService.createStudentProfile(
      userId,
      createStudentProfileDto,
    );
  }

  @Post('tutor')
  createTutorProfile(
    @Request() req: AuthenticatedRequest,
    @Body() createTutorProfileDto: CreateTutorProfileDto,
  ) {
    const userId = req.user.sub;
    return this.profileService.createTutorProfile(
      userId,
      createTutorProfileDto,
    );
  }

  @Get('status')
  getProfileStatus(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.profileService.getProfileStatus(userId);
  }

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.profileService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(id);
  }
}
