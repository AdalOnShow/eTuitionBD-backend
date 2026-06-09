import { Module } from '@nestjs/common';
import { SecurityModule } from 'src/auth/security.module';
import { PrismaModule } from 'src/prisma.module';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  imports: [PrismaModule, SecurityModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
