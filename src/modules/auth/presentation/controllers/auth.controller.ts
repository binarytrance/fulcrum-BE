import {
  Controller,
  Body,
  Post,
  UsePipes,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
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
  type ApiResponse as ApiResponseType,
  ok,
} from '@shared/presentation/responses/api-response';
import { ConfigService } from '@shared/config/config.service';
import {
  USER_REPO_PORT,
  type IUserRepository,
} from '@users/domain/ports/user-rep.port';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const AuthTokensSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5...' },
    refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5...' },
  },
};

const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupService: SignupService,
    private readonly localSigninService: LocalSigninService,
    private readonly oAuthSigninService: OAuthSigninService,
    private readonly verifyEmailService: VerifyEmailService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
    @Inject(USER_REPO_PORT) private readonly userRepo: IUserRepository,
    private readonly configService: ConfigService,
  ) {}

  // ── Local auth ──────────────────────────────────────────────────────────────

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(SignupSchema))
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'firstname', 'lastname'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        password: { type: 'string', minLength: 6, example: 'secret123' },
        firstname: { type: 'string', example: 'John' },
        lastname: { type: 'string', example: 'Doe' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Signup successful. Verification email sent.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 409, description: 'Email already registered.' })
  async signup(@Body() signupDto: SignupDto): Promise<ApiResponseType> {
    const { email, password, firstname, lastname } = signupDto;
    await this.signupService.create(email, password, firstname, lastname);
    return ok(
      'Signup successful. Please check your email for the verification token.',
    );
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(SigninSchema))
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        password: { type: 'string', example: 'secret123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in successfully.',
    schema: ApiSuccessSchema(AuthTokensSchema),
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async signin(
    @Body() signinDto: SigninDto,
  ): Promise<ApiResponseType<AuthTokens>> {
    const tokens = await this.localSigninService.execute(
      signinDto.email,
      signinDto.password,
    );
    return ok('Signed in successfully.', tokens);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(VerifyEmailSchema))
  @ApiOperation({ summary: 'Verify email with the 6-char hex token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'token'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
        token: { type: 'string', example: 'a3f9c2' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified. Returns auth tokens.',
    schema: ApiSuccessSchema(AuthTokensSchema),
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<ApiResponseType<AuthTokens>> {
    const tokens = await this.verifyEmailService.execute(dto.email, dto.token);
    return ok('Email verified successfully. You are now signed in.', tokens);
  }

  // ── Current user profile ────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved.',
    schema: ApiSuccessSchema({
      type: 'object',
      properties: {
        id:        { type: 'string' },
        email:     { type: 'string' },
        firstname: { type: 'string' },
        lastname:  { type: 'string', nullable: true },
      },
    }),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async me(
    @Req() req: Request,
  ): Promise<ApiResponseType<{ id: string; email: string; firstname: string; lastname: string | null }>> {
    const payload = req.user as TokenPayload;
    const user = await this.userRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return ok('User profile retrieved.', {
      id:        user.id,
      email:     user.email,
      firstname: user.firstname,
      lastname:  user.lastname,
    });
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow (open in browser)' })
  @ApiResponse({ status: 302, description: 'Redirects to Google.' })
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const tokens = await this.oAuthSigninService.execute(
        req.user as OAuthProfile,
      );
      const params = new URLSearchParams({
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      res.redirect(
        `${this.configService.frontendUrl}/signin/google/callback?${params.toString()}`,
      );
    } catch {
      res.redirect(
        `${this.configService.frontendUrl}/signin?error=oauth_failed`,
      );
    }
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Initiate GitHub OAuth flow (open in browser)' })
  @ApiResponse({ status: 302, description: 'Redirects to GitHub.' })
  githubLogin(): void {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiExcludeEndpoint()
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const tokens = await this.oAuthSigninService.execute(
        req.user as OAuthProfile,
      );
      const params = new URLSearchParams({
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      res.redirect(
        `${this.configService.frontendUrl}/signin/github/callback?${params.toString()}`,
      );
    } catch {
      res.redirect(
        `${this.configService.frontendUrl}/signin?error=oauth_failed`,
      );
    }
  }

  // ── Token management ─────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed.',
    schema: ApiSuccessSchema(AuthTokensSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked refresh token.',
  })
  async refresh(@Req() req: Request): Promise<ApiResponseType<AuthTokens>> {
    const payload = req.user as TokenPayload;
    const tokens = await this.tokenService.generateTokens(
      payload.sub,
      payload.email,
    );
    return ok('Tokens refreshed successfully.', tokens);
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sign out and revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Signed out successfully.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async signout(@Req() req: Request): Promise<ApiResponseType> {
    const payload = req.user as TokenPayload;
    await this.tokenService.revokeRefreshToken(payload.sub);
    return ok('Signed out successfully.');
  }
}