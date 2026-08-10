import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MESSAGE_PATTERNS, SignupUserRequest } from '@app/common';
import { UsersService } from '../services/users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(MESSAGE_PATTERNS.users.account.signup)
  signup(@Payload() request: SignupUserRequest) {
    return this.usersService.signup(request);
  }
}
