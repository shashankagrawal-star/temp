import nodemailer from "nodemailer";

export interface EtherealAccount {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
}

/** Creates a fresh Ethereal (fake SMTP) test account for a new sender. */
export async function createEtherealAccount(): Promise<EtherealAccount> {
  const account = await nodemailer.createTestAccount();
  return {
    smtpHost: account.smtp.host,
    smtpPort: account.smtp.port,
    smtpUser: account.user,
    smtpPass: account.pass,
    fromEmail: account.user,
  };
}

export interface SendResult {
  messageId: string;
  previewUrl: string | false;
}

export async function sendEmail(params: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName?: string | null;
  to: string;
  subject: string;
  body: string;
}): Promise<SendResult> {
  const transporter = nodemailer.createTransport({
    host: params.smtpHost,
    port: params.smtpPort,
    secure: false,
    auth: { user: params.smtpUser, pass: params.smtpPass },
  });

  const info = await transporter.sendMail({
    from: params.fromName ? `${params.fromName} <${params.fromEmail}>` : params.fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.body,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
}
