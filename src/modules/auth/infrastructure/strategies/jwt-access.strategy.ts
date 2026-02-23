import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@shared/config/config.service';
import { TokenPayload } from '@auth/domain/types/token.types';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.tokenSecrets.jwtAccessSecret,
    });
  }

  validate(payload: TokenPayload): TokenPayload {
    return payload;
  }
}
