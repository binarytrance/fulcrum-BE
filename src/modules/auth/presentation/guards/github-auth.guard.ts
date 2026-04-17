import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { OAuthPkceStateService } from '@auth/infrastructure/security/oauth-pkce-state.service';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  constructor(private readonly oauthPkceStateService: OAuthPkceStateService) {
    super();
  }

  getAuthenticateOptions(context: ExecutionContext): Record<string, string> {
    const req = context.switchToHttp().getRequest<Request>();
    const codeChallenge = req.query.code_challenge;

    if (typeof codeChallenge !== 'string') return {};

    return {
      state: this.oauthPkceStateService.createState(codeChallenge, 'github'),
    };
  }
}
