import { singleton } from 'tsyringe';
import { Env, Logger } from '~/app/shared/config';
import passport, { DoneCallback } from 'passport';
import { Profile, StrategyOptions, Strategy } from 'passport-github2';
import { AuthService } from '~/app/services';
import { IAuthAccount } from '~/app/interfaces/auth.interface';

@singleton()
export class GithhubStrategy {
  constructor(
    private readonly logger: Logger,
    private readonly env: Env,
    private readonly authService: AuthService
  ) {}

  public authenticate() {
    return passport.authenticate('github', {
      session: true,
    });
  }

  public authenticateCallback() {
    return passport.authenticate('github', { session: true });
  }

  public configure() {
    const githubStrategyOptions: StrategyOptions = {
      clientID: 'Iv23liEs3cAl52rRhXTI',
      clientSecret: '4c58a8b7242762b28131f7d0cd85ac150233969a',
      callbackURL: 'http://localhost:6969/api/v1/auth/github/callback',
    };

    passport.use(
      new Strategy(
        githubStrategyOptions,
        this.strategyOptionsHandler.bind(this)
      )
    );

    this.serializeUsers();
    this.deserializeUsers();
  }

  private async strategyOptionsHandler(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: DoneCallback
  ) {
    this.logger.info('Github passport details', {
      accessToken,
      refreshToken,
      profile,
    });
    try {
      const authProvider: IAuthAccount['authProvider'] = 'github';
      const providerUserId: IAuthAccount['providerUserId'] = profile.id;
      const username = profile.username || 'github-user';

      // user already linked
      const linkedUser = await this.authService.getLinkedUser(
        authProvider,
        providerUserId
      );

      if (linkedUser) {
        done(null, { id: linkedUser.userId, name: username });
        return;
      }

      // linking while logged in

      // not logged in -> try by email

      // merge flow

      done(null, {
        id: profile.id,
        name: profile.username ?? 'github-user',
      });
    } catch (err) {
      this.logger.error('GitHub verify failed', {
        err,
      });
      done(err as Error);
    }
  }

  private serializeUsers() {
    passport.serializeUser((u: any, done: DoneCallback) => {
      this.logger.info('passport serialized user', { user: u });
      done(null, u.id);
    });
  }

  private deserializeUsers() {
    passport.deserializeUser(async (id: string, done: DoneCallback) => {
      this.logger.info('passport deserialized user', { user: id });
      try {
        // fetch user…
        done(null, { id, name: 'github-user' });
      } catch (e) {
        done(e as Error);
      }
    });
  }
}
