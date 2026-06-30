/**
 * Mailgun email sender.
 *
 * Uses the Mailgun Messages API (HTTP Basic auth — same approach as
 * scripts/test-mailgun.ts, promoted to a re-usable service class).
 *
 * Required environment variables:
 *   MAILGUN_API_KEY   Your Mailgun API key
 *   MAILGUN_DOMAIN    Verified sending domain (e.g. botdoc.io)
 *   MAILGUN_FROM      "Display Name <address@domain>" — must use verified domain
 *
 * Optional:
 *   MAILGUN_BASE_URL  Override the API base (EU accounts: https://api.eu.mailgun.net)
 */

export interface EmailMessage {
  to: string[];
  subject: string;
  htmlBody: string;
  /** Optional plain-text fallback. */
  textBody?: string;
  /** Optional PDF attachment: { filename, data: Buffer } */
  attachment?: { filename: string; data: Buffer };
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class MailgunEmailService implements EmailSender {
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly from: string;
  private readonly baseUrl: string;

  constructor() {
    const missing = ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_FROM'].filter(
      (k) => !process.env[k],
    );
    if (missing.length > 0) {
      throw new Error(
        'Mailgun credentials are not configured.\n' +
          `Missing: ${missing.join(', ')}\n` +
          'Add them to .env (see .env.example and docs/IMPLEMENTATION_PLAN.md).',
      );
    }

    this.apiKey = process.env.MAILGUN_API_KEY!;
    this.domain = process.env.MAILGUN_DOMAIN!;
    this.from = process.env.MAILGUN_FROM!;
    this.baseUrl = process.env.MAILGUN_BASE_URL ?? 'https://api.mailgun.net';
  }

  async send(message: EmailMessage): Promise<void> {
    const url = `${this.baseUrl}/v3/${this.domain}/messages`;

    const form = new FormData();
    form.set('from', this.from);
    form.set('to', message.to.join(', '));
    form.set('subject', message.subject);
    form.set('html', message.htmlBody);
    if (message.textBody) form.set('text', message.textBody);

    if (message.attachment) {
      const blob = new Blob([message.attachment.data.buffer as ArrayBuffer], {
        type: 'application/pdf',
      });
      form.set('attachment', blob, message.attachment.filename);
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
      },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '(no body)');
      throw new Error(`Mailgun rejected the request (HTTP ${res.status}): ${body}`);
    }
  }
}
