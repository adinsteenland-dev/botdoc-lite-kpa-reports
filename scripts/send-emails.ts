/**
 * CLI entrypoint for the scheduled-email job.
 *
 * Usage (dev):   bun run scripts/send-emails.ts
 * Usage (prod):  node cron/send-emails.js   (bundled by Dockerfile)
 *
 * Exits 0 on success, 1 on failure — so Kubernetes can detect job status.
 */

import { sendScheduledEmails } from '../src/lib/sendScheduledEmails';

(async () => {
  try {
    const result = await sendScheduledEmails();
    console.log(
      `send-emails: sent=${result.sent} skipped=${result.skipped} failed=${result.failed} total=${result.total}`,
    );
    process.exit(0);
  } catch (err) {
    console.error('send-emails: fatal error', err);
    process.exit(1);
  }
})();
