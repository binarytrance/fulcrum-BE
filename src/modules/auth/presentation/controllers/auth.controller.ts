import { Controller, Body, Post, UsePipes } from '@nestjs/common';
import { SignupService } from '@/modules/auth/application/services/signup.service';
import {
  type SignupDto,
  SignupSchema,
} from '@auth/presentation/dtos/signup.dto';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import { HttpCode, HttpStatus } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly signupService: SignupService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(SignupSchema))
  async signup(@Body() signupDto: SignupDto): Promise<{ message: string }> {
    const { email, password, firstname, lastname } = signupDto;
    await this.signupService.create(email, password, firstname, lastname);
    return { message: 'Signup successful, verify your email' };
  }

  // @Post('verify-email')
  // @HttpCode(HttpStatus.OK)
  // @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  // async verifyEmail(@Body() verifyEmailDto: any): Promise<{ message: string }> {
  //   const { email, token } = verifyEmailDto;
  //   await this.signupService.verifyEmail(email, token);
  //   return { message: 'Email verified successfully' };
  // }
}
