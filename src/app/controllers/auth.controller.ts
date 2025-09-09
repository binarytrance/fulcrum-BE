import passport from 'passport';
import { StatusCodes } from 'http-status-codes';
import { Request, Response, NextFunction } from 'express';
import { injectable } from 'tsyringe';
import { Logger } from '@shared/config';
import { Validate } from '@shared/decorators';
import { loginSchema, signUpSchema } from '@schemas';
import { ILogin, ISignup, PassportInfo } from '@interfaces';
import { InternalServerError, UnAuthorizedError } from '@shared/errors';

@injectable()
export class AuthController {
  constructor(private readonly logger: Logger) {
    this.localLogin = this.localLogin.bind(this);
    this.localSignup = this.localSignup.bind(this);
    this.googleAuthenticate = this.googleAuthenticate.bind(this);
    this.googleCallback = this.googleCallback.bind(this);
    this.githubAuthenticate = this.githubAuthenticate.bind(this);
    this.githubCallback = this.githubCallback.bind(this);
    this.logout = this.logout.bind(this);
  }

  public githubAuthenticate(req: Request, res: Response, next: NextFunction) {
    this.logger.info('auth controller: githubAuthenticate getting called');
    return passport.authenticate('github', {
      session: true,
      scope: ['user:email'],
    })(req, res, next);
  }

  public async githubCallback(req: Request, res: Response, next: NextFunction) {
    return passport.authenticate(
      'github',
      (err: Error | null, user?: Express.User, info?: { message: string }) => {
        this.logger.warn('pending oauth', { user: req.session.pendingOAuth });
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect('/');
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          req.session.regenerate(() => {
            req.session.save(() => res.redirect('/'));
          });
        });
      }
    )(req, res, next);
  }

  public googleAuthenticate(req: Request, res: Response, next: NextFunction) {
    this.logger.info('auth controller: githubAuthenticate getting called');
    return passport.authenticate('google', {
      session: true,
      scope: ['openid', 'email', 'profile'],
    })(req, res, next);
  }

  public async googleCallback(req: Request, res: Response, next: NextFunction) {
    return passport.authenticate(
      'google',
      (err: Error | null, user?: Express.User, info?: { message: string }) => {
        this.logger.warn('pending oauth', { user: req.session.pendingOAuth });
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.redirect('/');
        }

        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }

          req.session.regenerate(() => {
            req.session.save(() => res.redirect('/'));
          });
        });
      }
    )(req, res, next);
  }

  @Validate({ body: loginSchema })
  public async localLogin(
    req: Request<{}, {}, ILogin>,
    res: Response,
    next: NextFunction
  ) {
    passport.authenticate(
      'local-login',
      (err: Error | null, user?: Express.User, info?: PassportInfo) => {
        if (err) {
          return next(err);
        }

        this.logger.info('Local login works', { user });
        if (!user) {
          throw new UnAuthorizedError(info?.message ?? 'Invalid credentials');
        }

        req.login(user, (err: unknown) => {
          if (err) {
            return next(err as Error);
          }

          return res.success(
            { id: user.id, name: user.name, email: req.body.email },
            'Logged in successfully',
            StatusCodes.OK
          );
        });
      }
    )(req, res, next);
  }

  @Validate({ body: signUpSchema })
  public async localSignup(
    req: Request<{}, {}, ISignup>,
    res: Response,
    next: NextFunction
  ) {
    passport.authenticate(
      'local-signup',
      (err: Error | null, user?: Express.User, info?: PassportInfo) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          throw new InternalServerError('Unable to create user', {
            message: info?.message,
          });
        }

        req.login(user, (err: unknown) => {
          if (err) {
            return next(err);
          }

          return res.success(
            { id: user.id, name: user.name, email: req.body.email },
            'sign up successful',
            StatusCodes.CREATED
          );
        });
      }
    )(req, res, next);
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    req.logout((err) => {
      if (err) {
        return next(err);
      }

      req.session.destroy((err) => {
        if (err) {
          return next(err);
        }
      });

      return res.success(null, 'logged out successfully', StatusCodes.OK);
    });
  }
}
