import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@shared/config/config.service';
import { AuthProviders } from '@auth/domain/types/auth.types';
import { OAuthProfile } from '@auth/domain/types/token.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.google.clientID,
      clientSecret: configService.google.clientSecret,
      callbackURL: configService.google.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OAuthProfile {
    return {
      provider: AuthProviders.GOOGLE,
      providerId: profile.id,
      email: profile.emails![0].value,
      firstname: profile.name?.givenName ?? '',
      lastname: profile.name?.familyName ?? null,
    };
  }
}
