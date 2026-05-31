import nodemailer from "nodemailer";

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

export async function sendEmail({ to, subject, html, text }: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const transport = createTransport();

  if (!transport) {
    // Dev fallback — print to console
    console.log("\n📧 [DEV EMAIL]");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text ?? html}`);
    console.log("");
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? `"DevMind" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
}
