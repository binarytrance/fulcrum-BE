import { Request } from 'express';
import passport, { DoneCallback } from 'passport';
import { IStrategyOptionsWithRequest, Strategy } from 'passport-local';
import { delay, inject, singleton } from 'tsyringe';
import { Env, Logger } from '@shared/config';
import { ILogin, ISignup, IVerifyCallback } from '@interfaces';
import { AuthService, UserService } from '@services';

@singleton()
export class LocalStrategy {
  constructor(
    private readonly logger: Logger,
    private readonly env: Env,
    @inject(delay(() => UserService)) private readonly userService: UserService,
    @inject(delay(() => AuthService)) private readonly authService: AuthService
  ) {}

  public configure() {
    const options: IStrategyOptionsWithRequest = {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    };

    passport.use(
      'local-login',
      new Strategy(options, this.verifyLogin.bind(this))
    );
    passport.use(
      'local-signup',
      new Strategy(options, this.verifySignup.bind(this))
    );

    this.serializeUsers();
    this.deserializeUsers();
  }

  private async verifySignup(
    req: Request<{}, {}, ISignup>,
    _email: string,
    _password: string,
    done: IVerifyCallback
  ) {
    try {
      const { name, email, password } = req.body;

      const existingUserByEmail = await this.userService.getAvailableEmail(
        email
      );
      if (existingUserByEmail) {
        return done(null, undefined, { message: 'Email already registered' });
      }

      const user = await this.userService.createUser(email, name);
      await this.authService.createLocalCredential(user.id, password);
      return done(null, { id: user.id, name: user.name });
    } catch (err: unknown) {
      return done(err as Error, undefined);
    }
  }

  private async verifyLogin(
    req: Request<{}, {}, ILogin>,
    _email: string,
    _password: string,
    done: IVerifyCallback
  ) {
    try {
      const { email, password } = req.body;

      const user = await this.authService.loginWithCredential(email, password);
      if (!user) {
        return done(null, undefined, { message: 'Invalid Credential' });
      }

      return done(null, { id: user.id, name: user.name });
    } catch (err: unknown) {
      return done(err as Error, undefined);
    }
  }

  private serializeUsers() {
    passport.serializeUser((user: Express.User, done: DoneCallback) => {
      this.logger.info('passport serialized user', { user: user });
      done(null, user);
    });
  }

  private deserializeUsers() {
    passport.deserializeUser(async (user: Express.User, done: DoneCallback) => {
      this.logger.info('passport deserialized user', { user });
      try {
        done(null, user);
      } catch (e) {
        done(e as Error);
      }
    });
  }
}
