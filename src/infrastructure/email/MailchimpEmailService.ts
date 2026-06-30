/**
 * MailChimp Transactional (Mandrill) SMTP service.
 *
 * Credentials required in environment:
 *   MAILCHIMP_SMTP_HOST   e.g. smtp.mandrillapp.com
 *   MAILCHIMP_SMTP_PORT   e.g. 587
 *   MAILCHIMP_SMTP_USER   your Mandrill username
 *   MAILCHIMP_SMTP_PASS   your Mandrill API key (used as SMTP password)
 *   MAILCHIMP_FROM        e.g. "Botdoc Reports <reports@botdoc.io>"
 *
 * Until credentials are configured this class can be instantiated but send()
 * will throw a clear error rather than silently swallowing the call.
 */

export interface EmailMessage {
  to: string[];
  subject: string;
  htmlBody: string;
  /** Optional plain-text fallback. */
  textBody?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class MailchimpEmailService implements EmailSender {
  private configured: boolean;

  constructor() {
    this.configured = !!(
      process.env.MAILCHIMP_SMTP_HOST &&
      process.env.MAILCHIMP_SMTP_USER &&
      process.env.MAILCHIMP_SMTP_PASS
    );
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.configured) {
      throw new Error(
        'MailChimp SMTP credentials are not configured. ' +
          'Set MAILCHIMP_SMTP_HOST, MAILCHIMP_SMTP_USER, MAILCHIMP_SMTP_PASS, and MAILCHIMP_FROM in your environment.',
      );
    }

    // TODO: wire up nodemailer with the SMTP credentials above once provided.
    // Example:
    //   const transporter = nodemailer.createTransport({
    //     host: process.env.MAILCHIMP_SMTP_HOST,
    //     port: Number(process.env.MAILCHIMP_SMTP_PORT ?? 587),
    //     auth: { user: process.env.MAILCHIMP_SMTP_USER, pass: process.env.MAILCHIMP_SMTP_PASS },
    //   });
    //   await transporter.sendMail({
    //     from: process.env.MAILCHIMP_FROM,
    //     to: message.to.join(', '),
    //     subject: message.subject,
    //     html: message.htmlBody,
    //     text: message.textBody,
    //   });
    throw new Error('MailChimp SMTP sending not yet implemented — credentials pending.');
  }
}
