import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      status: 'success',
      statusCode: 200,
      message:
        'Welcome to the NestJS API, and the server is running successfully!',
    };
  }
}
