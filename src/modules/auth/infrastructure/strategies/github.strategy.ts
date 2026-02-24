import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@shared/config/config.service';
import { AuthProviders } from '@auth/domain/types/auth.types';
import { OAuthProfile } from '@auth/domain/types/token.types';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.github.clientID,
      clientSecret: configService.github.clientSecret,
      callbackURL: configService.github.callbackURL,
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OAuthProfile {
    const displayName = profile.displayName?.trim() || profile.username || '';
    const [firstname, ...rest] = displayName.split(' ');

    return {
      provider: AuthProviders.GITHUB,
      providerId: profile.id,
      email: profile.emails![0].value,
      firstname: firstname || profile.username || 'Unknown',
      lastname: rest.length > 0 ? rest.join(' ') : null,
    };
  }
}
