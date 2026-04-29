/**
 * Fulcrum transactional email templates.
 *
 * All templates are inline-CSS HTML compatible with major email clients.
 * Light-mode palette optimised for email readability:
 *   Page bg     : #f4f4f5  (Zinc 100)
 *   Card        : #ffffff
 *   Border      : #e4e4e7  (Zinc 200)
 *   Accent grad : #a78bfa → #f472b6  (violet → pink, brand)
 *   Text primary: #18181b  (Zinc 900)
 *   Text body   : #3f3f46  (Zinc 700)
 *   Text muted  : #71717a  (Zinc 500)
 *   Token bg    : #faf5ff  (Purple 50)
 *   Token text  : #6d28d9  (Violet 700)
 *   Font        : Geist Sans (Google Fonts), system-ui fallback
 */

const BASE_URL = 'https://fulcrumapp.co';
const YEAR = new Date().getFullYear();

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
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:500px;width:100%;background-color:#ffffff;border-radius:16px;
                      border:1px solid #e4e4e7;box-shadow:0 1px 6px rgba(0,0,0,0.06);overflow:hidden;">

          <!-- gradient accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#a78bfa 0%,#c084fc 50%,#f472b6 100%);
                       border-radius:16px 16px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- logo -->
          <tr>
            <td align="center" style="padding:36px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;">
                    <div style="width:30px;height:30px;
                                background:linear-gradient(135deg,#a78bfa 0%,#f472b6 100%);
                                border-radius:8px;text-align:center;line-height:30px;
                                font-size:15px;">&#9889;</div>
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                                 font-size:18px;font-weight:700;color:#18181b;
                                 letter-spacing:-0.4px;">Fulcrum</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- injected body content -->
          ${content}

          <!-- footer -->
          <tr>
            <td style="padding:24px 48px 36px 48px;
                       border-top:1px solid #e4e4e7;">
              <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                         font-size:12px;color:#a1a1aa;text-align:center;
                         margin:0 0 6px 0;line-height:1.7;">
                You received this email because you have an account at
                <a href="${BASE_URL}" style="color:#71717a;text-decoration:underline;">fulcrumapp.co</a>.
              </p>
              <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                         font-size:12px;color:#d4d4d8;text-align:center;
                         margin:0;line-height:1.7;">
                &copy; ${YEAR} Fulcrum. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── OTP token block ─────────────────────────────────────────────────────── */
function tokenBlock(token: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0"
       style="margin:0 auto;">
  <tr>
    <td align="center"
        style="background:#faf5ff;border:1px solid #c4b5fd;
               border-radius:12px;padding:20px 40px;">
      <span style="font-family:'Geist',ui-monospace,'Cascadia Code',monospace;
                   font-size:32px;font-weight:700;letter-spacing:4px;
                   color:#6d28d9;display:block;text-align:center;">
        ${token}
      </span>
    </td>
  </tr>
</table>`;
}

/* ── Divider ─────────────────────────────────────────────────────────────── */
function divider(): string {
  return `
<tr>
  <td style="padding:0 48px;">
    <div style="height:1px;background:#e4e4e7;"></div>
  </td>
</tr>
<tr><td style="height:28px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
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
  <tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- headline -->
  <tr>
    <td style="padding:0 48px 12px 48px;text-align:center;">
      <h1 style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                  font-size:24px;font-weight:700;color:#18181b;
                  margin:0;line-height:1.3;letter-spacing:-0.4px;">
        Verify your email address
      </h1>
    </td>
  </tr>

  <!-- sub-copy -->
  <tr>
    <td style="padding:0 48px 32px 48px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:15px;color:#3f3f46;margin:0;line-height:1.7;">
        Enter the code below in the Fulcrum app to confirm your email
        and activate your account.
      </p>
    </td>
  </tr>

  <!-- token -->
  <tr>
    <td style="padding:0 48px 12px 48px;text-align:center;">
      ${tokenBlock(token)}
    </td>
  </tr>

  <!-- expiry -->
  <tr>
    <td style="padding:12px 48px 32px 48px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0;line-height:1.6;">
        This code expires in&nbsp;<strong style="color:#3f3f46;font-weight:600;">15 minutes</strong>.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- reassurance -->
  <tr>
    <td style="padding:0 48px 36px 48px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#a1a1aa;margin:0;line-height:1.7;">
        If you didn&rsquo;t create a Fulcrum account, you can safely ignore this email.
        No action is required.
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
  return `Verify your Fulcrum email address
─────────────────────────────────

Enter this code in the app to activate your account:

    ${token}

This code expires in 15 minutes.

If you didn't sign up for Fulcrum, you can ignore this email.

— The Fulcrum Team
${BASE_URL}`;
}

/**
 * Password-reset email.
 * @param token  Reset token to display as OTP pill.
 */
export function passwordResetEmailHtml(token: string): string {
  const content = `
  <tr><td style="height:36px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- headline -->
  <tr>
    <td style="padding:0 48px 12px 48px;text-align:center;">
      <h1 style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                  font-size:24px;font-weight:700;color:#18181b;
                  margin:0;line-height:1.3;letter-spacing:-0.4px;">
        Reset your password
      </h1>
    </td>
  </tr>

  <!-- sub-copy -->
  <tr>
    <td style="padding:0 48px 32px 48px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:15px;color:#3f3f46;margin:0;line-height:1.7;">
        We received a request to reset the password on your Fulcrum account.
        Use the code below to continue.
      </p>
    </td>
  </tr>

  <!-- token -->
  <tr>
    <td style="padding:0 48px 12px 48px;text-align:center;">
      ${tokenBlock(token)}
    </td>
  </tr>

  <!-- expiry -->
  <tr>
    <td style="padding:12px 48px 32px 48px;text-align:center;">
      <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                 font-size:13px;color:#52525b;margin:0;line-height:1.6;">
        This code expires in&nbsp;<strong style="color:#3f3f46;font-weight:600;">10 minutes</strong>.
      </p>
    </td>
  </tr>

  ${divider()}

  <!-- security note -->
  <tr>
    <td style="padding:0 48px 36px 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
             style="background:#fafafa;border:1px solid #e4e4e7;
                    border-radius:10px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="font-family:'Geist',system-ui,-apple-system,sans-serif;
                       font-size:13px;color:#71717a;margin:0;line-height:1.7;">
              <strong style="color:#3f3f46;font-weight:600;">Didn&rsquo;t request this?</strong>
              &nbsp;Your account is secure. You can safely ignore this email &mdash;
              your password will not be changed.
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
  return `Reset your Fulcrum password
───────────────────────────────────

Use this code to reset your password:

    ${token}

This code expires in 10 minutes.

Didn't request this? Your account is secure — no action needed.

— The Fulcrum Team
${BASE_URL}`;
}
