export enum AuthJobs {
  SEND_SIGNUP_VERIFICATION = 'auth.send-signup-verification',
}

export interface AuthJobPayloads {
  [AuthJobs.SEND_SIGNUP_VERIFICATION]: {
    email: string;
    verificationToken: string | null;
  };
}
