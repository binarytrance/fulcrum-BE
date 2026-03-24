import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: { message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    const req = context.switchToHttp().getRequest() as {
      oauthError?: string;
    };

    if (err) {
      req.oauthError =
        err instanceof Error ? err.message : 'Google authentication failed';
      return null as TUser;
    }

    if (!user) {
      req.oauthError = info?.message || 'Google authentication failed';
      return null as TUser;
    }

    return user as TUser;
  }
}
