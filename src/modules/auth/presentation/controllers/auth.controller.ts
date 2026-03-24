import {
  Controller,
  Body,
  Post,
  UsePipes,
  Get,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  BadRequestException,
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
import type { Request } from 'express';
import type { Response } from 'express';
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
import { GoogleOAuthRedirectService } from '@auth/application/services/google-oauth-redirect.service';
import {
  clearAuthCookies,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
  setAuthCookies,
} from '@auth/presentation/utils/auth-cookie.util';
import { ConfigService } from '@shared/config/config.service';

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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly signupService: SignupService,
    private readonly localSigninService: LocalSigninService,
    private readonly oAuthSigninService: OAuthSigninService,
    private readonly googleOauthRedirectService: GoogleOAuthRedirectService,
    private readonly verifyEmailService: VerifyEmailService,
    private readonly configService: ConfigService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {}

  // Local

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
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<AuthTokens>> {
    const tokens = await this.localSigninService.execute(
      signinDto.email,
      signinDto.password,
    );
    setAuthCookies(res, tokens, this.configService);
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<AuthTokens>> {
    const tokens = await this.verifyEmailService.execute(dto.email, dto.token);
    setAuthCookies(res, tokens, this.configService);
    return ok('Email verified successfully. You are now signed in.', tokens);
  }

  // Google OAuth

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth flow (open in browser)' })
  @ApiResponse({ status: 302, description: 'Redirects to Google.' })
  googleLogin(
    @Query('redirect_uri') redirectUri: string | undefined,
    @Res() res: Response,
  ): void {
    if (!redirectUri) {
      throw new BadRequestException('redirect_uri is required');
    }
    const googleUrl =
      this.googleOauthRedirectService.createGoogleConsentUrl(redirectUri);
    res.redirect(HttpStatus.FOUND, googleUrl);
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleCallback(
    @Req() req: Request,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!state) {
      throw new BadRequestException('state is required');
    }

    const redirectUri =
      this.googleOauthRedirectService.resolveRedirectUriFromState(state);

    try {
      const oauthReq = req as Request & { oauthError?: string };
      if (!oauthReq.user) {
        throw new Error(oauthReq.oauthError || 'Google sign-in failed');
      }
      const tokens = await this.oAuthSigninService.execute(
        req.user as OAuthProfile,
      );
      setAuthCookies(res, tokens, this.configService);
      res.redirect(
        HttpStatus.FOUND,
        this.googleOauthRedirectService.buildSuccessRedirect(redirectUri),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Google sign-in failed';
      res.redirect(
        HttpStatus.FOUND,
        this.googleOauthRedirectService.buildErrorRedirect(redirectUri, message),
      );
    }
  }

  // Github OAuth

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
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<AuthTokens>> {
    const tokens = await this.oAuthSigninService.execute(
      req.user as OAuthProfile,
    );
    setAuthCookies(res, tokens, this.configService);
    return ok('Signed in with GitHub successfully.', tokens);
  }

  // Refresh token

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
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType<AuthTokens>> {
    const payload = req.user as TokenPayload;
    const tokens = await this.tokenService.generateTokens(
      payload.sub,
      payload.email,
    );
    setAuthCookies(res, tokens, this.configService);
    return ok('Tokens refreshed successfully.', tokens);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current session from auth cookies' })
  @ApiResponse({
    status: 200,
    description: 'Session is active.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  me(
    @Req() req: Request,
  ): ApiResponseType<{ userId: string; email: string; authenticated: boolean }> {
    const accessToken = getAccessTokenFromCookies(req);
    if (!accessToken) {
      throw new UnauthorizedException('Missing access token cookie');
    }
    const payload = this.tokenService.verifyAccessToken(accessToken);
    return ok('Session is active.', {
      userId: payload.sub,
      email: payload.email,
      authenticated: true,
    });
  }

  // signout

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
  async signout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponseType> {
    const payload = req.user as TokenPayload;
    await this.tokenService.revokeRefreshToken(payload.sub);
    clearAuthCookies(res, this.configService);
    return ok('Signed out successfully.');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromCookies(req);

    if (refreshToken) {
      try {
        const payload = this.tokenService.verifyRefreshToken(refreshToken);
        await this.tokenService.revokeRefreshToken(payload.sub);
      } catch {
        // Ignore invalid refresh tokens, cookie clear is still valid.
      }
    }

    clearAuthCookies(res, this.configService);
    res.status(HttpStatus.OK).json(ok('Logged out successfully.'));
  }
}
