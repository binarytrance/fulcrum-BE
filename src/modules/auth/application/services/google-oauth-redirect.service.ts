import { Injectable } from '@nestjs/common';
import { ConfigService } from '@shared/config/config.service';
import { OauthStateService } from './oauth-state.service';
import {
  appendQueryParams,
  parseAllowedOrigins,
  validateRedirectUriAgainstAllowlist,
} from '@auth/application/utils/redirect-uri.helper';

@Injectable()
export class GoogleOAuthRedirectService {
  private readonly allowedOrigins: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly oauthStateService: OauthStateService,
  ) {
    this.allowedOrigins = parseAllowedOrigins(
      this.configService.auth.frontendAllowedOrigins,
    );
  }

  createGoogleConsentUrl(redirectUri: string): string {
    const validatedRedirectUri = this.validateRedirectUri(redirectUri);
    const state = this.oauthStateService.create(validatedRedirectUri);

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', this.configService.google.clientID);
    googleAuthUrl.searchParams.set('redirect_uri', this.configService.google.callbackURL);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', state);

    return googleAuthUrl.toString();
  }

  resolveRedirectUriFromState(state: string): string {
    const redirectUri = this.oauthStateService.verifyAndGetRedirectUri(state);
    return this.validateRedirectUri(redirectUri);
  }

  buildSuccessRedirect(redirectUri: string): string {
    return appendQueryParams(redirectUri, { status: 'success' });
  }

  buildErrorRedirect(redirectUri: string, message: string): string {
    return appendQueryParams(redirectUri, {
      status: 'error',
      message,
    });
  }

  getFallbackRedirectUri(): string {
    const [firstAllowedOrigin] = [...this.allowedOrigins];
    return `${firstAllowedOrigin}${this.configService.auth.oauthErrorPath}`;
  }

  private validateRedirectUri(redirectUri: string): string {
    return validateRedirectUriAgainstAllowlist(redirectUri, this.allowedOrigins);
  }
}
