import { Request } from 'express';
import { delay, inject, injectable } from 'tsyringe';
import passport, { DoneCallback } from 'passport';
import {
  Profile,
  Strategy,
  StrategyOptionsWithRequest,
} from 'passport-google-oauth20';
import { Env, Logger } from '@shared/config';
import { IAuthAccount, IVerifyCallback } from '@interfaces';
import { AuthService } from '@services';

@injectable()
export class GoogleStrategy {
  private authProvider: IAuthAccount['authProvider'] = 'google';

  constructor(
    private readonly env: Env,
    private readonly logger: Logger,
    @inject(delay(() => AuthService)) private readonly authService: AuthService
  ) {}

  public async configure() {
    const options: StrategyOptionsWithRequest = {
      clientID: this.env.google.CLIENT_ID,
      clientSecret: this.env.google.CLIENT_SECRET,
      callbackURL: 'http://localhost:6969/api/v1/auth/google/callback',
      passReqToCallback: true,
      scope: ['openid', 'email', 'profile'],
    };

    passport.use(new Strategy(options, this.verify.bind(this)));
    this.serializeUsers();
    this.deserializeUsers();
  }

  private async verify(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: IVerifyCallback
  ) {
    try {
      this.logger.warn('google login details', { profile });
      const email = this.getEmail(profile);
      const name = this.getName(profile, email);
      const valid = this.authService.checkEmailValidity(email);
      if (!valid) {
        return done(null, undefined, { message: 'valid email not found' });
      }

      const user = await this.authService.loginOrSignupWithProvider(
        email,
        name,
        this.authProvider,
        profile.id
      );

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

  private getEmail(profile: Profile) {
    const primaryEmail =
      profile.emails?.find((email) => email.verified) ?? profile.emails?.[0];
    return primaryEmail?.value.toLowerCase() ?? '';
  }

  private getName(profile: Profile, email: string) {
    return (
      profile.displayName ||
      [profile.name?.givenName, profile.name?.familyName]
        .filter(Boolean)
        .join(' ') ||
      email.split('@')[0]
    );
  }
}
