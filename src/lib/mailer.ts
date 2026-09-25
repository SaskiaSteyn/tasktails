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
      Source: process.env.SES_FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "Verify your TaskTails email" },
        Body: {
          Text: {
            Data: `Confirm your email to finish creating your TaskTails account:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't request this, you can ignore it.`,
          },
        },
      },
    }),
  );
}
