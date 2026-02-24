import {
  Controller,
  Body,
  Post,
  UsePipes,
  Get,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { SignupService } from '@/modules/auth/application/services/signup.service';
import { LocalSigninService } from '@auth/application/services/local-signin.service';
import { OAuthSigninService } from '@auth/application/services/oauth-signin.service';
import {
  type SignupDto,
  SignupSchema,
} from '@auth/presentation/dtos/signup.dto';
import {
  type SigninDto,
  SigninSchema,
} from '@auth/presentation/dtos/signin.dto';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import { GoogleAuthGuard } from '@auth/presentation/guards/google-auth.guard';
import { GithubAuthGuard } from '@auth/presentation/guards/github-auth.guard';
import { JwtAuthGuard } from '@auth/presentation/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '@auth/presentation/guards/jwt-refresh.guard';
import type {
  OAuthProfile,
  AuthTokens,
  TokenPayload,
} from '@auth/domain/types/token.types';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import { VerifyEmailService } from '@auth/application/services/verify-email.service';
import {
  type VerifyEmailDto,
  VerifyEmailSchema,
} from '@auth/presentation/dtos/verify-email.dto';
import {
  type ApiResponse,
  ok,
} from '@shared/presentation/responses/api-response';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupService: SignupService,
    private readonly localSigninService: LocalSigninService,
    private readonly oAuthSigninService: OAuthSigninService,
    private readonly verifyEmailService: VerifyEmailService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {}

  // Local

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(SignupSchema))
  async signup(@Body() signupDto: SignupDto): Promise<ApiResponse> {
    const { email, password, firstname, lastname } = signupDto;
    await this.signupService.create(email, password, firstname, lastname);
    return ok(
      'Signup successful. Please check your email for the verification token.',
    );
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(SigninSchema))
  async signin(@Body() signinDto: SigninDto): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.localSigninService.execute(
      signinDto.email,
      signinDto.password,
    );
    return ok('Signed in successfully.', tokens);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.verifyEmailService.execute(dto.email, dto.token);
    return ok('Email verified successfully. You are now signed in.', tokens);
  }

  // Google OAuth

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.oAuthSigninService.execute(
      req.user as OAuthProfile,
    );
    return ok('Signed in with Google successfully.', tokens);
  }

  // Github OAuth

  @Get('github')
  @UseGuards(GithubAuthGuard)
  githubLogin(): void {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: Request): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this.oAuthSigninService.execute(
      req.user as OAuthProfile,
    );
    return ok('Signed in with GitHub successfully.', tokens);
  }

  // Refresh token

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request): Promise<ApiResponse<AuthTokens>> {
    const payload = req.user as TokenPayload;
    const tokens = await this.tokenService.generateTokens(
      payload.sub,
      payload.email,
    );
    return ok('Tokens refreshed successfully.', tokens);
  }

  // signout

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async signout(@Req() req: Request): Promise<ApiResponse> {
    const payload = req.user as TokenPayload;
    await this.tokenService.revokeRefreshToken(payload.sub);
    return ok('Signed out successfully.');
  }
}
