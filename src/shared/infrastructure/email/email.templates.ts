/**
 * Fulcrum transactional email templates.
 *
 * All templates are inline-CSS HTML compatible with major email clients.
 * Brand palette mirrors the Fulcrum web app:
 *   Background  : #0e0e11 (near-black)
 *   Card        : #18181f
 *   Border      : rgba(255,255,255,0.08)
 *   Accent grad : #a78bfa → #f472b6  (violet → pink, matches hero title)
 *   Text primary: #f4f4f5
 *   Text muted  : #71717a
 *   Font        : Geist Sans (Google Fonts), system-ui fallback
 */

const BASE_URL = 'https://fulcrumapp.co';

/* ── Shared layout shell ─────────────────────────────────────────────────── */
function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0e0e11;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#0e0e11;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- email card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:520px;width:100%;background-color:#18181f;border-radius:16px;
                      border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

          <!-- gradient header bar -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#a78bfa 0%,#c084fc 40%,#f472b6 100%);
                       font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- logo + wordmark -->
          <tr>
            <td align="center" style="padding:36px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:8px;">
                    <!-- ⚡ bolt icon (inline SVG encoded as img for client compat) -->
                    <span style="display:inline-block;width:28px;height:28px;
                                 background:linear-gradient(135deg,#a78bfa,#f472b6);
                                 border-radius:6px;text-align:center;line-height:28px;
                                 font-size:16px;">⚡</span>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                                 font-size:20px;font-weight:700;color:#f4f4f5;
                                 letter-spacing:-0.3px;">Fulcrum</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- main content injected here -->
          ${content}

          <!-- footer -->
          <tr>
            <td style="padding:0 40px 36px 40px;border-top:1px solid rgba(255,255,255,0.06);
                       padding-top:24px;margin-top:32px;">
              <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                         font-size:12px;color:#52525b;text-align:center;margin:0 0 8px 0;
                         line-height:1.6;">
                You're receiving this because you signed up at
                <a href="${BASE_URL}" style="color:#a78bfa;text-decoration:none;">fulcrumapp.co</a>.
              </p>
              <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                         font-size:12px;color:#3f3f46;text-align:center;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} Fulcrum. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /email card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── Token pill (OTP-style display) ─────────────────────────────────────── */
function tokenPill(token: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center"
        style="background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.25);
               border-radius:10px;padding:16px 32px;">
      <span style="font-family:'Geist Mono',ui-monospace,'Cascadia Code',monospace;
                   font-size:28px;font-weight:700;letter-spacing:6px;color:#e4d9ff;">
        ${token}
      </span>
    </td>
  </tr>
</table>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC TEMPLATE FUNCTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Verification email sent after signup.
 * @param token  6-character OTP or JWT fragment to display.
 */
export function verificationEmailHtml(token: string): string {
  const content = `
  <!-- body padding top -->
  <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- headline -->
  <tr>
    <td style="padding:0 40px 8px 40px;text-align:center;">
      <h1 style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                  font-size:26px;font-weight:700;color:#f4f4f5;
                  margin:0;line-height:1.25;letter-spacing:-0.5px;">
        Verify your email
      </h1>
    </td>
  </tr>

  <!-- sub-heading -->
  <tr>
    <td style="padding:0 40px 28px 40px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:15px;color:#a1a1aa;margin:0;line-height:1.65;">
        Welcome to Fulcrum! Use the code below to verify your email address
        and activate your account.
      </p>
    </td>
  </tr>

  <!-- token -->
  <tr>
    <td style="padding:0 40px 28px 40px;text-align:center;">
      ${tokenPill(token)}
    </td>
  </tr>

  <!-- expiry note -->
  <tr>
    <td style="padding:0 40px 32px 40px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0;line-height:1.6;">
        This code expires in <strong style="color:#71717a;">15 minutes</strong>.
        If you didn't create an account, you can safely ignore this email.
      </p>
    </td>
  </tr>

  <!-- divider -->
  <tr>
    <td style="padding:0 40px 28px 40px;">
      <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
    </td>
  </tr>

  <!-- what's next blurb -->
  <tr>
    <td style="padding:0 40px 32px 40px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0 0 6px 0;">Once verified, you can start:</p>
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#71717a;margin:0;line-height:1.8;">
        🎯 Setting goals &nbsp;·&nbsp; 🔁 Building habits
        &nbsp;·&nbsp; ⏱ Tracking deep work sessions
      </p>
    </td>
  </tr>
  `;

  return shell(content);
}

/**
 * Plain-text fallback for verification email.
 */
export function verificationEmailText(token: string): string {
  return `Welcome to Fulcrum!

Verify your email address by entering this code:

  ${token}

This code expires in 15 minutes.

If you didn't sign up, you can ignore this email.

— The Fulcrum Team
${BASE_URL}`;
}

/**
 * Password-reset email.
 * @param token  Reset token to display as OTP pill.
 */
export function passwordResetEmailHtml(token: string): string {
  const content = `
  <!-- body padding top -->
  <tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- lock icon -->
  <tr>
    <td style="padding:0 40px 16px 40px;text-align:center;">
      <div style="display:inline-block;width:48px;height:48px;
                  background:rgba(244,114,182,0.1);border:1px solid rgba(244,114,182,0.2);
                  border-radius:12px;line-height:48px;font-size:24px;text-align:center;">
        🔒
      </div>
    </td>
  </tr>

  <!-- headline -->
  <tr>
    <td style="padding:0 40px 8px 40px;text-align:center;">
      <h1 style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                  font-size:26px;font-weight:700;color:#f4f4f5;
                  margin:0;line-height:1.25;letter-spacing:-0.5px;">
        Reset your password
      </h1>
    </td>
  </tr>

  <!-- sub-heading -->
  <tr>
    <td style="padding:0 40px 28px 40px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:15px;color:#a1a1aa;margin:0;line-height:1.65;">
        We received a request to reset the password for your Fulcrum account.
        Use the code below to continue.
      </p>
    </td>
  </tr>

  <!-- token -->
  <tr>
    <td style="padding:0 40px 28px 40px;text-align:center;">
      ${tokenPill(token)}
    </td>
  </tr>

  <!-- expiry + safety note -->
  <tr>
    <td style="padding:0 40px 32px 40px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0 0 8px 0;line-height:1.6;">
        This code expires in <strong style="color:#71717a;">10 minutes</strong>.
      </p>
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0;line-height:1.6;">
        If you didn't request a password reset, your account is safe —
        no action is needed.
      </p>
    </td>
  </tr>

  <!-- divider -->
  <tr>
    <td style="padding:0 40px 28px 40px;">
      <div style="height:1px;background:rgba(255,255,255,0.06);"></div>
    </td>
  </tr>

  <!-- security tip -->
  <tr>
    <td style="padding:0 40px 32px 40px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
             style="background:rgba(244,114,182,0.05);border:1px solid rgba(244,114,182,0.12);
                    border-radius:10px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                       font-size:12px;color:#71717a;margin:0;line-height:1.6;">
              <strong style="color:#a1a1aa;">Security tip:</strong>
              Fulcrum will never ask for your password or this code via chat or phone.
              Only enter it on <a href="${BASE_URL}" style="color:#a78bfa;text-decoration:none;">fulcrumapp.co</a>.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  `;

  return shell(content);
}

/**
 * Plain-text fallback for password-reset email.
 */
export function passwordResetEmailText(token: string): string {
  return `Fulcrum — Password Reset

Use this code to reset your password:

  ${token}

This code expires in 10 minutes.

If you didn't request this, your account is safe — no action needed.

— The Fulcrum Team
${BASE_URL}`;
}
