import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { GithhubStrategy } from '~/app/shared/services';
import { Tokens } from '../core/di';

@injectable()
export class AuthRouter {
  constructor(
    @inject(Tokens.AUTH_ROUTER) private readonly authRouter: Router,
    private githubStrategy: GithhubStrategy
  ) {}

  public mount(): Router {
    this.authRouter.get('/github', this.githubStrategy.authenticate());
    this.authRouter.get(
      '/github/callback',
      this.githubStrategy.authenticateCallback(),
      (req, res) => res.redirect('/')
    );

    return this.authRouter;
  }
}
