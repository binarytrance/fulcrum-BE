import { Request } from 'express';
import { delay, inject, singleton } from 'tsyringe';
import passport, { DoneCallback } from 'passport';
import {
  Profile,
  Strategy,
  StrategyOptionsWithRequest,
} from 'passport-github2';
import { Env, Logger } from '@shared/config';
import { AuthService, UserService } from '@services';
import { IAuthAccount, IVerifyCallback } from '@interfaces';

@singleton()
export class GithhubStrategy {
  private authProvider: IAuthAccount['authProvider'] = 'github';
  private userAgent: string = 'Fulcrum-Dev/1.0 (+http://localhost:6969)';

  constructor(
    private readonly logger: Logger,
    private readonly env: Env,
    @inject(delay(() => AuthService)) private readonly authService: AuthService,
    @inject(delay(() => UserService)) private readonly userService: UserService
  ) {}

  public configure() {
    const options: StrategyOptionsWithRequest = {
      clientID: this.env.github.CLIENT_ID,
      clientSecret: this.env.github.CLIENT_SECRET,
      callbackURL: 'http://localhost:6969/api/v1/auth/github/callback',
      passReqToCallback: true,
      userAgent: this.userAgent,
      scope: ['user:email'],
      proxy: true,
    };

    passport.use(new Strategy(options, this.verify.bind(this)));
    this.serializeUsers();
    this.deserializeUsers();
  }

  private async verify(
    req: Request,
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: IVerifyCallback
  ) {
    try {
      const name = profile.username || 'github-user';
      const email = this.getEmail(profile, accessToken);
      const valid = this.authService.checkEmailValidity(email);
      if (!valid || !email) {
        return done(null, undefined, { message: 'valid email not found' });
      }

      const user = await this.authService.loginOrSignupWithProvider(
        email,
        name,
        this.authProvider,
        profile.id
      );

      return done(null, { id: user.id, name: user.name });
    } catch (error: unknown) {
      return done(error as Error, undefined);
    }
  }

  private getEmail(profile: Profile, accessToken: string) {
    return (profile.emails && profile.emails[0]?.value) || '';
  }

  private serializeUsers() {
    passport.serializeUser((user: Express.User, done: DoneCallback) => {
      this.logger.info('passport serialized user', { user: user });
      done(null, user);
    });
  }

  private deserializeUsers() {
    passport.deserializeUser(async (user: Express.User, done: DoneCallback) => {
      try {
        done(null, user);
      } catch (e) {
        done(e as Error);
      }
    });
  }
}
