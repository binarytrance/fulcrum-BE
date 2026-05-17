import {
  Controller,
  Body,
  Post,
  UsePipes,
  Get,
  Delete,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
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
  AuthSessionView,
  OAuthProfile,
  RefreshSessionContext,
  TokenPayload,
} from '@auth/domain/types/token.types';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import { VerifyEmailService } from '@auth/application/services/verify-email.service';
import { AuthSessionService } from '@auth/application/services/auth-session.service';
import {
  type VerifyEmailDto,
  VerifyEmailSchema,
} from '@auth/presentation/dtos/verify-email.dto';
import {
  type ResendVerificationDto,
  ResendVerificationSchema,
} from '@auth/presentation/dtos/resend-verification.dto';
import {
  type ApiResponse as ApiResponseType,
  ok,
} from '@shared/presentation/responses/api-response';
import { ConfigService } from '@shared/config/config.service';
import { OAuthPkceCodeService } from '@auth/application/services/oauth-pkce-code.service';
import { OAuthPkceStateService } from '@auth/infrastructure/security/oauth-pkce-state.service';
import {
  type IFindUserPort,
  FIND_USER_PORT,
} from '@auth/domain/ports/find-user.port';
import {
  type OAuthCodeExchangeDto,
  OAuthCodeExchangeSchema,
} from '@auth/presentation/dtos/oauth-code-exchange.dto';
import { ForgotPasswordService } from '@auth/application/services/forgot-password.service';
import { ResetPasswordService } from '@auth/application/services/reset-password.service';
import {
  type ForgotPasswordDto,
  ForgotPasswordSchema,
} from '@auth/presentation/dtos/forgot-password.dto';
import {
  type ResetPasswordDto,
  ResetPasswordSchema,
} from '@auth/presentation/dtos/reset-password.dto';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const AccessTokenSchema = {
  type: 'object',
  properties: {
    accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5...' },
  },
};

const SessionSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string' },
    current: { type: 'boolean' },
    userAgent: { type: 'string', nullable: true },
    ipAddress: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    lastRotatedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
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

// ─── Cookie config ────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupService: SignupService,
    private readonly localSigninService: LocalSigninService,
    private readonly oAuthSigninService: OAuthSigninService,
    private readonly oauthPkceCodeService: OAuthPkceCodeService,
    private readonly oauthPkceStateService: OAuthPkceStateService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly authSessionService: AuthSessionService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    private readonly configService: ConfigService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
  ) {}

  // ── Cookie helpers ───────────────────────────────────────────────────────────

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: this.configService.isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_TTL_MS,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: this.configService.isProd,
      sameSite: 'lax',
      path: '/',
    });
  }

  private getSessionContext(req: Request): RefreshSessionContext {
    return {
      userAgent: req.get('user-agent') ?? null,
      ipAddress: req.ip ?? null,
    };
  }

  private getTokenPayload(req: Request): TokenPayload {
    const user = req.user as Record<string, unknown>;
    return {
      sub: String(user.sub),
      email: String(user.email),
      sessionId: String(user.sessionId),
    };
  }

  private hashPkceVerifier(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
  }

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

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResendVerificationSchema))
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', format: 'email', example: 'john@example.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'If the email is pending verification a new code has been sent.',
    schema: ApiSuccessSchema(),
  })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<ApiResponseType> {
    await this.signupService.resendVerification(dto.email);
    return ok(
      'If your email is awaiting verification, a new code has been sent.',
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
    description:
      'Signed in successfully. Refresh token set as HttpOnly cookie.',
    schema: ApiSuccessSchema(AccessTokenSchema),
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async signin(
    @Req() req: Request,
    @Body() signinDto: SigninDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<{ accessToken: string }>> {
    const tokens = await this.localSigninService.execute(
      signinDto.email,
      signinDto.password,
      this.getSessionContext(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return ok('Signed in successfully.', { accessToken: tokens.accessToken });
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
    description:
      'Email verified. Returns access token; refresh token set as HttpOnly cookie.',
    schema: ApiSuccessSchema(AccessTokenSchema),
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token.' })
  async verifyEmail(
    @Req() req: Request,
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<{ accessToken: string }>> {
    const tokens = await this.verifyEmailService.execute(
      dto.email,
      dto.token,
      this.getSessionContext(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return ok('Email verified successfully. You are now signed in.', {
      accessToken: tokens.accessToken,
    });
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
        id: { type: 'string' },
        email: { type: 'string' },
        firstname: { type: 'string' },
        lastname: { type: 'string', nullable: true },
        appStreak: {
          type: 'object',
          properties: {
            current: { type: 'integer', example: 7, description: 'Consecutive active days. 0 if streak is broken.' },
            longest: { type: 'integer', example: 21, description: 'All-time longest streak.' },
            lastActiveDate: { type: 'string', format: 'date', example: '2026-05-10', nullable: true },
          },
        },
      },
    }),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async me(@Req() req: Request): Promise<
    ApiResponseType<{
      id: string;
      email: string;
      firstname: string;
      lastname: string | null;
      appStreak: { current: number; longest: number; lastActiveDate: string | null };
    }>
  > {
    const payload = req.user as TokenPayload;
    const user = await this.findUser.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = (() => {
      const d = new Date(`${today}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const { lastActiveDate, longest } = user.appStreak;
    const isLive = lastActiveDate === today || lastActiveDate === yesterday;
    const appStreak = {
      current: isLive ? user.appStreak.current : 0,
      longest,
      lastActiveDate,
    };

    return ok('User profile retrieved.', {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      appStreak,
    });
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth flow with PKCE (open in browser)',
  })
  @ApiQuery({
    name: 'code_challenge',
    required: true,
    description:
      'PKCE code challenge (S256) generated by the frontend from code_verifier.',
    schema: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{43,128}$',
      example: '2f6hY2uB8R4dJ6rW0eN9xK1pM3qT5vL7aC9sE1gH3jQ',
    },
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirects to Google consent screen. After provider callback, backend redirects to frontend with one-time code (not token).',
  })
  @ApiResponse({ status: 400, description: 'Invalid PKCE code_challenge.' })
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const state = this.oauthPkceStateService.verifyState(
        typeof req.query.state === 'string' ? req.query.state : undefined,
        'google',
      );

      if (!state) {
        res.redirect(
          `${this.configService.frontendUrl}/signin?error=invalid_pkce_state`,
        );
        return;
      }

      const code = await this.oauthPkceCodeService.issueAuthorizationCode({
        profile: req.user as OAuthProfile,
        codeChallenge: state.codeChallenge,
        provider: 'google',
      });

      const params = new URLSearchParams({ code });
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
  @ApiOperation({
    summary: 'Initiate GitHub OAuth flow with PKCE (open in browser)',
  })
  @ApiQuery({
    name: 'code_challenge',
    required: true,
    description:
      'PKCE code challenge (S256) generated by the frontend from code_verifier.',
    schema: {
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{43,128}$',
      example: '2f6hY2uB8R4dJ6rW0eN9xK1pM3qT5vL7aC9sE1gH3jQ',
    },
  })
  @ApiResponse({
    status: 302,
    description:
      'Redirects to GitHub consent screen. After provider callback, backend redirects to frontend with one-time code (not token).',
  })
  @ApiResponse({ status: 400, description: 'Invalid PKCE code_challenge.' })
  githubLogin(): void {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiExcludeEndpoint()
  async githubCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const state = this.oauthPkceStateService.verifyState(
        typeof req.query.state === 'string' ? req.query.state : undefined,
        'github',
      );

      if (!state) {
        res.redirect(
          `${this.configService.frontendUrl}/signin?error=invalid_pkce_state`,
        );
        return;
      }

      const code = await this.oauthPkceCodeService.issueAuthorizationCode({
        profile: req.user as OAuthProfile,
        codeChallenge: state.codeChallenge,
        provider: 'github',
      });

      const params = new URLSearchParams({ code });
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

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(OAuthCodeExchangeSchema))
  @ApiOperation({
    summary:
      'Exchange one-time OAuth authorization code + PKCE verifier for app tokens',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'code_verifier'],
      properties: {
        code: { type: 'string', example: '95b95af4-c9d6-42ce-9d39-77b9f97...' },
        code_verifier: {
          type: 'string',
          example: 'QhI8fG0x_3WQ3h7dCbe5WEciP0rV4QWEA2I6hWwI2a0',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'OAuth code exchanged successfully. Refresh token set as HttpOnly cookie; access token returned in body.',
    schema: ApiSuccessSchema(AccessTokenSchema),
  })
  @ApiResponse({
    status: 401,
    description:
      'Invalid/expired authorization code or PKCE verification failed.',
  })
  async exchangeOAuthCode(
    @Req() req: Request,
    @Body() dto: OAuthCodeExchangeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<{ accessToken: string }>> {
    const pending = await this.oauthPkceCodeService.consumeAuthorizationCode(
      dto.code,
    );
    if (!pending) {
      throw new UnauthorizedException('Invalid or expired authorization code');
    }

    const expectedChallenge = this.hashPkceVerifier(dto.code_verifier);
    if (!this.safeEqual(expectedChallenge, pending.codeChallenge)) {
      throw new UnauthorizedException('PKCE verification failed');
    }

    const tokens = await this.oAuthSigninService.execute(
      pending.profile,
      this.getSessionContext(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken);

    return ok('OAuth code exchanged successfully.', {
      accessToken: tokens.accessToken,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth('refresh-token-cookie')
  @ApiOperation({
    summary: 'Rotate refresh token cookie, return new access token',
  })
  @ApiResponse({
    status: 200,
    description:
      'Tokens rotated. New refresh token set as HttpOnly cookie; access token returned in body.',
    schema: ApiSuccessSchema(AccessTokenSchema),
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or revoked refresh token cookie.',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<{ accessToken: string }>> {
    const { sub, email, sessionId } = this.getTokenPayload(req);
    const tokens = await this.authSessionService.rotateTokens(
      sub,
      email,
      String(sessionId),
      this.getSessionContext(req),
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return ok('Tokens refreshed successfully.', {
      accessToken: tokens.accessToken,
    });
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active signed-in sessions for the user' })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved.',
    schema: ApiSuccessSchema({
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          items: SessionSchema,
        },
      },
    }),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async listSessions(
    @Req() req: Request,
  ): Promise<ApiResponseType<{ sessions: AuthSessionView[] }>> {
    const { sub, sessionId } = this.getTokenPayload(req);
    const sessions = await this.authSessionService.listUserSessions(
      sub,
      String(sessionId),
    );

    return ok('Active sessions retrieved.', {
      sessions,
    });
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a specific signed-in session' })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async revokeSession(
    @Req() req: Request,
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType> {
    const payload = req.user as TokenPayload;
    await this.authSessionService.revokeSession(payload.sub, sessionId);

    if (payload.sessionId === sessionId) {
      this.clearRefreshCookie(res);
    }

    return ok('Session revoked successfully.');
  }

  @Post('signout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Sign out of all devices and revoke all sessions' })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async signoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType> {
    const payload = req.user as TokenPayload;
    await this.authSessionService.revokeAllSessions(payload.sub);
    this.clearRefreshCookie(res);
    return ok('All sessions revoked successfully.');
  }

  @Post('signout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth('refresh-token-cookie')
  @ApiOperation({ summary: 'Sign out: revoke refresh token and clear cookie' })
  @ApiResponse({
    status: 200,
    description: 'Signed out successfully.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async signout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType> {
    const payload = req.user as TokenPayload;
    await this.tokenService.revokeRefreshToken(payload.sub, payload.sessionId);
    this.clearRefreshCookie(res);
    return ok('Signed out successfully.');
  }

  // ── Forgot / Reset password ────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ForgotPasswordSchema))
  @ApiOperation({
    summary: 'Request a password reset email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'If the email is registered, a password reset token will be sent.',
    schema: ApiSuccessSchema(),
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ApiResponseType> {
    await this.forgotPasswordService.requestReset(dto.email);
    return ok(
      'If that email is registered, a password reset link has been sent.',
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResetPasswordSchema))
  @ApiOperation({
    summary: 'Reset password using the token from email',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'token', 'newPassword'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'john@example.com',
        },
        token: {
          type: 'string',
          example: 'a3f9c2',
        },
        newPassword: {
          type: 'string',
          minLength: 6,
          example: 'newSecret456',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired reset token.' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponseType> {
    await this.resetPasswordService.execute(
      dto.email,
      dto.token,
      dto.newPassword,
    );
    return ok('Password reset successfully.');
  }
}
