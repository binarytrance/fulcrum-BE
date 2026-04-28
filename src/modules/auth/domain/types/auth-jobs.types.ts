export enum AuthJobs {
  SEND_SIGNUP_VERIFICATION = 'auth.send-signup-verification',
  SEND_FORGOT_PASSWORD = 'auth.send-forgot-password',
}

export interface AuthJobPayloads {
  [AuthJobs.SEND_SIGNUP_VERIFICATION]: {
    email: string;
    verificationToken: string | null;
  };
  [AuthJobs.SEND_FORGOT_PASSWORD]: {
    email: string;
    resetToken: string | null;
  };
}
