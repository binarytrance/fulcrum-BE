import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@shared/config/config.service';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import { TokenPayload } from '@auth/domain/types/token.types';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.tokenSecrets.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: TokenPayload): Promise<TokenPayload> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const isValid = await this.tokenService.isRefreshTokenValid(
      payload.sub,
      token,
    );
    if (!isValid)
      throw new UnauthorizedException('Refresh token invalid or expired');

    return payload;
  }
}
