import { Router } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '@core/di';
import { AuthController } from '@controllers';

@injectable()
export class AuthRouter {
  constructor(
    @inject(Tokens.GITHUB_AUTH_ROUTER) private readonly authRouter: Router,
    private authController: AuthController
  ) {}

  public mount(): Router {
    this.authRouter.get('/github', this.authController.githubAuthenticate);
    this.authRouter.get('/github/callback', this.authController.githubCallback);

    this.authRouter.post('/local/login', this.authController.localLogin);
    this.authRouter.post('/local/signup', this.authController.localSignup);

    this.authRouter.get('/google', this.authController.googleAuthenticate);
    this.authRouter.get('/google/callback', this.authController.googleCallback);

    return this.authRouter;
  }
}
