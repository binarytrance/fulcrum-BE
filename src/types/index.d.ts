import 'express-session';

type SuccessResponse<T> = (
  data: T,
  message: string,
  statusCode: number
) => void;

type FailResponse = (
  error: SerializedErrorOptions,
  message: string,
  statusCode: number
) => void;

declare global {
  namespace Express {
    interface Response {
      success: SuccessResponse<unknown>;
      fail: FailResponse;
    }
  }
}

interface PendingOAuthUser {
  provider: AuthProviders;
  providerUserId: string;
  email: string | null;
}

interface SessionUser {
  id: string;
  name: string;
}

declare global {
  namespace Express {
    // Makes req.user strongly typed
    interface User extends SessionUser {}
  }
}

declare module 'express-session' {
  interface SessionData {
    passport?: { user: string };
    pendingOAuth?: PendingOAuth;
  }
}
