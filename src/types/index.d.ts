import 'express-session';

type SuccessResponse<T> = (
  data: T,
  message: string,
  statusCode: number,
) => void;

type FailResponse = (
  error: SerializedErrorOptions,
  message: string,
  statusCode: number,
) => void;

declare global {
  namespace Express {
    interface Response {
      success: SuccessResponse<unknown>;
      fail: FailResponse;
    }
  }
}

interface SessionUser {
  id: string;
  name: string;
}

declare module 'express-session' {
  interface SessionData {
    user: SessionUser | null;
  }
}
