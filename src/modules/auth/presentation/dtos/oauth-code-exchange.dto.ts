import z from 'zod';

const PKCE_VERIFIER_REGEX = /^[A-Za-z0-9._~-]{43,128}$/;

export const OAuthCodeExchangeSchema = z.object({
  code: z.string().min(1),
  code_verifier: z.string().regex(PKCE_VERIFIER_REGEX),
});

export type OAuthCodeExchangeDto = z.infer<typeof OAuthCodeExchangeSchema>;
