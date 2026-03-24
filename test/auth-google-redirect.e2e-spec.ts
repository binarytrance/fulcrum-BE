import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/modules/auth/presentation/controllers/auth.controller';
import { SignupService } from '../src/modules/auth/application/services/signup.service';
import { LocalSigninService } from '../src/modules/auth/application/services/local-signin.service';
import { OAuthSigninService } from '../src/modules/auth/application/services/oauth-signin.service';
import { VerifyEmailService } from '../src/modules/auth/application/services/verify-email.service';
import { TOKEN_PORT } from '../src/modules/auth/domain/ports/token.port';
import { GoogleOAuthRedirectService } from '../src/modules/auth/application/services/google-oauth-redirect.service';
import { OauthStateService } from '../src/modules/auth/application/services/oauth-state.service';
import { ConfigService } from '../src/shared/config/config.service';
import { GoogleAuthGuard } from '../src/modules/auth/presentation/guards/google-auth.guard';

class MockGoogleAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = {
      provider: 'GOOGLE',
      providerId: 'google-user-id',
      email: 'user@example.com',
      firstname: 'Jane',
      lastname: 'Doe',
    };
    return true;
  }
}

describe('Auth Google redirect flow (e2e)', () => {
  let app: INestApplication<App>;
  let oauthSigninService: { execute: jest.Mock };
  let googleOAuthRedirectService: GoogleOAuthRedirectService;

  beforeEach(async () => {
    oauthSigninService = {
      execute: jest.fn().mockResolvedValue({
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        GoogleOAuthRedirectService,
        OauthStateService,
        { provide: SignupService, useValue: { create: jest.fn() } },
        { provide: LocalSigninService, useValue: { execute: jest.fn() } },
        { provide: OAuthSigninService, useValue: oauthSigninService },
        { provide: VerifyEmailService, useValue: { execute: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            isProd: false,
            google: {
              clientID: 'google-client-id',
              clientSecret: 'google-client-secret',
              callbackURL: 'http://localhost:6969/api/v1/auth/google/callback',
            },
            auth: {
              frontendAllowedOrigins: 'http://localhost:3000',
              oauthStateSecret: 'super-secret-state-key',
              oauthErrorPath: '/signup/google/callback',
              cookieDomain: undefined,
              cookieSecure: false,
              accessCookieMaxAgeSeconds: 900,
              refreshCookieMaxAgeSeconds: 30 * 24 * 60 * 60,
            },
          },
        },
        {
          provide: TOKEN_PORT,
          useValue: {
            verifyAccessToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
            generateTokens: jest.fn(),
          },
        },
        { provide: GoogleAuthGuard, useClass: MockGoogleAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    googleOAuthRedirectService = app.get(GoogleOAuthRedirectService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('successful Google callback sets cookies and redirects', async () => {
    const consentUrl = googleOAuthRedirectService.createGoogleConsentUrl(
      'http://localhost:3000/signup/google/callback',
    );
    const state = new URL(consentUrl).searchParams.get('state')!;

    const response = await request(app.getHttpServer())
      .get(`/auth/google/callback?state=${encodeURIComponent(state)}`)
      .expect(302);

    expect(response.headers.location).toBe(
      'http://localhost:3000/signup/google/callback?status=success',
    );

    const setCookie = response.headers['set-cookie'] as string[];
    expect(setCookie.some((value) => value.startsWith('accessToken='))).toBe(
      true,
    );
    expect(setCookie.some((value) => value.startsWith('refreshToken='))).toBe(
      true,
    );
    expect(setCookie.some((value) => value.includes('HttpOnly'))).toBe(true);
    expect(setCookie.some((value) => value.includes('SameSite=Lax'))).toBe(
      true,
    );
    expect(setCookie.some((value) => value.includes('Path=/'))).toBe(true);
  });

  it('invalid state is rejected', async () => {
    await request(app.getHttpServer())
      .get('/auth/google/callback?state=invalid-state')
      .expect(400);
  });

  it('invalid redirect_uri is rejected', async () => {
    await request(app.getHttpServer())
      .get('/auth/google?redirect_uri=http://malicious.example/callback')
      .expect(400);
  });

  it('error in callback redirects with status=error', async () => {
    oauthSigninService.execute.mockRejectedValueOnce(new Error('oauth failed'));
    const consentUrl = googleOAuthRedirectService.createGoogleConsentUrl(
      'http://localhost:3000/signup/google/callback',
    );
    const state = new URL(consentUrl).searchParams.get('state')!;

    const response = await request(app.getHttpServer())
      .get(`/auth/google/callback?state=${encodeURIComponent(state)}`)
      .expect(302);

    const redirectUrl = new URL(response.headers.location);
    expect(
      `${redirectUrl.origin}${redirectUrl.pathname}`,
    ).toBe('http://localhost:3000/signup/google/callback');
    expect(redirectUrl.searchParams.get('status')).toBe('error');
    expect(redirectUrl.searchParams.get('message')).toBe('oauth failed');
  });
});
