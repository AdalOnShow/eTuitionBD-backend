import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}
  registerUser() {
    // Implementation for user registration
    this.userService.createUser();
  }
}
