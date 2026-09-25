import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

/**
 * The one place that sends mail — currently just the registration
 * verification link. See DEPLOY.md's SES section for why this is SES's HTTPS
 * API rather than SMTP: new AWS accounts throttle/block outbound port 25 on
 * EC2, so a `nodemailer`-style SMTP send to another provider fails there.
 *
 * Credentials come from the instance's IAM role (the default AWS SDK
 * credential chain) — same pattern as the ECR pulls in `docker-compose.prod.yml`.
 * Region comes from the `AWS_REGION` env var the SDK already reads by itself.
 *
 * `SES_FROM_EMAIL` doubles as the enablement flag, the same convention
 * `isGoogleEnabled` in `src/auth.ts` uses for Google OAuth: unset in local
 * dev (no SES identity to send from there), so the link is logged instead of
 * mailed, and registration still works without any AWS setup.
 */
export const isEmailEnabled = Boolean(process.env.SES_FROM_EMAIL);

const ses = new SESClient({});

/**
 * Tables and inline styles only — Gmail and Outlook strip or ignore most
 * `<head>` CSS, so this can't be written like a normal component. The VML
 * block is Outlook desktop's own button syntax; every other client gets the
 * plain `<a>` in the `[if !mso]` branch. Both must point at the same
 * `verifyUrl`. Logo is the hosted `horizontal.svg`; Gmail/Outlook don't
 * render SVG `<img>` and fall back to the `alt` text there — a deliberate
 * tradeoff to reuse the existing brand asset rather than exporting a PNG
 * (design_handoff/design_handoff_verify_email). Fonts are Fredoka/Nunito
 * with system fallbacks for clients that skip the Google Fonts `<link>`.
 * "24 hours" here must keep matching `VERIFICATION_TOKEN_TTL_MS` in
 * `src/lib/users.ts`.
 */
function verificationEmailHtml(verifyUrl: string, origin: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Confirm your TaskTails email</title>
<!--[if !mso]><!--><link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet"><!--<![endif]-->
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  :root { color-scheme: light only; }
  body { margin:0; padding:0; }
  a { color:#C9633F; }
  a:hover { color:#B85838; }
  @media (max-width:620px) {
    .card { padding:32px 22px !important; }
    .h1 { font-size:24px !important; line-height:30px !important; }
  }
</style>
</head>
<body class="bg" style="margin:0;padding:0;background-color:#F1E9DC;">
<span style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#F1E9DC;opacity:0;">One tap to confirm your email and meet Mochi, your first pet. Link expires in 24 hours.&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</span>

<table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1E9DC;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <tr>
          <td align="center" style="padding:0 0 22px;">
            <a href="${origin}" style="text-decoration:none;">
              <img src="${origin}/brand/horizontal.svg" width="200" height="40" alt="TaskTails" style="display:block;width:200px;height:40px;border:0;">
            </a>
          </td>
        </tr>

        <tr>
          <td class="card" style="background-color:#FFFFFF;border:1px solid #EFE7DA;border-radius:20px;padding:40px 40px 34px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="padding:0 0 14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#FBEAE3;border-radius:20px;padding:5px 12px;font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:11px;line-height:14px;mso-line-height-rule:exactly;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#B85838;">Almost there</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="h1 ink" align="center" style="font-family:Fredoka,'Trebuchet MS',Arial,sans-serif;font-size:28px;line-height:34px;mso-line-height-rule:exactly;font-weight:bold;color:#2E2A26;padding:0 0 12px;">Confirm your email</td>
              </tr>
              <tr>
                <td class="soft" align="center" style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:24px;mso-line-height-rule:exactly;color:#524C47;padding:0 0 28px;">Confirm your email to finish creating your TaskTails account. Mochi, your first pet, is waiting for you on the other side.</td>
              </tr>
              <tr>
                <td align="center" style="padding:0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="#E27A54" style="background-color:#E27A54;border-radius:13px;">
                        <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${verifyUrl}" style="height:50px;v-text-anchor:middle;width:240px;" arcsize="26%" stroke="f" fillcolor="#E27A54"><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Confirm email</center></v:roundrect><![endif]-->
                        <!--[if !mso]><!-->
                        <a href="${verifyUrl}" style="display:block;padding:15px 44px;font-family:Fredoka,'Trebuchet MS',Arial,sans-serif;font-size:16px;line-height:20px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:13px;">Confirm email</a>
                        <!--<![endif]-->
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="height:26px;font-size:0;line-height:0;">&nbsp;</td>
              </tr>
              <tr>
                <td class="rule" style="border-top:1px solid #EFE7DA;font-size:0;line-height:0;padding:0;height:1px;">&nbsp;</td>
              </tr>
              <tr>
                <td class="soft" style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#74685A;padding:26px 0 6px;">Button not working? Paste this link into your browser:</td>
              </tr>
              <tr>
                <td style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;word-break:break-all;padding:0 0 18px;">
                  <a href="${verifyUrl}" style="color:#C9633F;text-decoration:underline;">${verifyUrl}</a>
                </td>
              </tr>
              <tr>
                <td class="soft" style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:20px;mso-line-height-rule:exactly;color:#74685A;">This link expires in 24 hours. If you didn't create a TaskTails account, you can safely ignore this email — nothing will happen.</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="soft" align="center" style="font-family:Nunito,'Segoe UI',Arial,sans-serif;font-size:12px;line-height:18px;mso-line-height-rule:exactly;color:#74685A;padding:24px 20px 0;">
            You're receiving this because this address was used to sign up at <a href="${origin}" style="color:#74685A;text-decoration:underline;">${new URL(origin).host}</a>.<br>
            This is a one-time account email, not a mailing list.
          </td>
        </tr>

      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  origin: string,
): Promise<void> {
  const verifyUrl = `${origin}/api/auth/verify?token=${token}`;

  if (!isEmailEnabled) {
    console.log(`[mailer] SES not configured — verification link for ${to}: ${verifyUrl}`);
    return;
  }

  await ses.send(
    new SendEmailCommand({
      Source: `TaskTails <${process.env.SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "Verify your TaskTails email" },
        Body: {
          Html: { Data: verificationEmailHtml(verifyUrl, origin) },
          Text: {
            Data: `Confirm your email to finish creating your TaskTails account. Mochi, your first pet, is waiting for you on the other side.\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create a TaskTails account, you can safely ignore this email — nothing will happen.`,
          },
        },
      },
    }),
  );
}
