/**
 * Core scheduled-email dispatch logic — framework-agnostic.
 *
 * Used by:
 *  - POST /api/cron/send-emails (HTTP route, thin wrapper)
 *  - scripts/send-emails.ts     (CLI entrypoint for K8s CronJob)
 */

import { PostgresEmailScheduleRepository } from '@/infrastructure/db/PostgresEmailScheduleRepository';
import { PostgresEmailLogRepository } from '@/infrastructure/db/PostgresEmailLogRepository';
import { PostgresEmailContactRepository } from '@/infrastructure/db/PostgresEmailContactRepository';
import { PostgresCustomerRepository } from '@/infrastructure/db/PostgresCustomerRepository';
import { MailgunEmailService } from '@/infrastructure/email/MailgunEmailService';
import { generateReportToken } from '@/lib/reportToken';

export interface SendResult {
  sent: number;
  skipped: number;
  failed: number;
  total: number;
}

const LOGO_URL = 'https://reports-private.botdoc.io/botdoc-logo.png';

export async function sendScheduledEmails(): Promise<SendResult> {
  const scheduleRepo = new PostgresEmailScheduleRepository();
  const logRepo = new PostgresEmailLogRepository();
  const contactRepo = new PostgresEmailContactRepository();
  const customerRepo = new PostgresCustomerRepository();
  const mailer = new MailgunEmailService();

  const due = await scheduleRepo.findDue();

  if (due.length === 0) {
    return { sent: 0, skipped: 0, failed: 0, total: 0 };
  }

  // Batch-fetch all unique customers referenced by due schedules
  const customerIds = [...new Set(due.map((s) => s.customerId))];
  const customers = await Promise.all(customerIds.map((id) => customerRepo.findById(id)));
  const customerMap = new Map(
    customers.filter(Boolean).map((c) => [c!.id, c!]),
  );

  const baseUrl = process.env.APP_BASE_URL ?? 'https://reports-private.botdoc.io';

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const schedule of due) {
    const customer = customerMap.get(schedule.customerId);
    const customerName = customer?.name ?? 'Your Dealership Group';

    // ── Fetch contacts ────────────────────────────────────────────────────
    const contacts = schedule.storeName
      ? await contactRepo.findByCustomerAndStore(schedule.customerId, schedule.storeName)
      : await contactRepo.findByCustomer(schedule.customerId);

    if (contacts.length === 0) {
      await logRepo.save({
        customerId: schedule.customerId,
        storeName: schedule.storeName,
        scheduleId: schedule.id,
        recipientCount: 0,
        status: 'failed',
        error: 'No contacts configured for this schedule.',
      });
      await scheduleRepo.markFired(schedule.id);
      skipped++;
      continue;
    }

    // ── Build scoped report URL with signed token ─────────────────────────
    const token = generateReportToken(schedule.customerId, schedule.storeName);
    const reportUrl = schedule.storeName
      ? `${baseUrl}/customers/${schedule.customerId}/stores/${encodeURIComponent(schedule.storeName)}?token=${token}`
      : `${baseUrl}/customers/${schedule.customerId}/report?token=${token}`;

    const subject = schedule.storeName
      ? `${schedule.storeName} — Botdoc Connect Report`
      : `${customerName} — Botdoc Connect Report`;

    // ── Send ──────────────────────────────────────────────────────────────
    try {
      await mailer.send({
        to: contacts.map((c) => c.email),
        subject,
        htmlBody: buildEmailHtml({ customerName, storeName: schedule.storeName, reportUrl }),
        textBody: `Your Botdoc Connect report is ready. View it here: ${reportUrl}`,
      });

      await logRepo.save({
        customerId: schedule.customerId,
        storeName: schedule.storeName,
        scheduleId: schedule.id,
        recipientCount: contacts.length,
        status: 'sent',
        error: null,
      });

      sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logRepo.save({
        customerId: schedule.customerId,
        storeName: schedule.storeName,
        scheduleId: schedule.id,
        recipientCount: 0,
        status: 'failed',
        error: message,
      });
      failed++;
    }

    // Advance or cancel regardless of send success so we don't double-fire
    await scheduleRepo.markFired(schedule.id);
  }

  return { sent, skipped, failed, total: due.length };
}

// ── Email template ────────────────────────────────────────────────────────────

function buildEmailHtml({
  customerName,
  storeName,
  reportUrl,
}: {
  customerName: string;
  storeName: string | null;
  reportUrl: string;
}): string {
  const title = storeName
    ? `${storeName} Usage Report`
    : `${customerName} Usage Report`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0f2044;padding:24px 40px;">
              <img src="${LOGO_URL}" alt="Botdoc" height="36" style="display:block;border:0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f2044;">${title}</h1>
              <p style="margin:0 0 28px;font-size:15px;color:#4a5568;line-height:1.6;">
                Your latest Botdoc Connect usage report is ready to view. Click the button below to open your dashboard.
              </p>
              <a href="${reportUrl}"
                 style="display:inline-block;background:#0f2044;color:#ffffff;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;text-decoration:none;">
                View Report &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #e8ecf0;">
              <p style="margin:0;font-size:12px;color:#a0aec0;line-height:1.6;">
                You&rsquo;re receiving this because you&rsquo;re subscribed to scheduled reports from Botdoc.
                Contact your Botdoc account manager to update your preferences.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
