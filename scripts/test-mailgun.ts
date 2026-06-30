/**
 * Mailgun connection POC.
 *
 * Proves that our Mailgun credentials can actually send an email. This is the
 * first task of Phase 3 (see docs/IMPLEMENTATION_PLAN.md) — run it before
 * building the real MailgunEmailSender / weekly delivery.
 *
 * Run it with Bun (which auto-loads .env):
 *   bun run test:mailgun you@example.com
 * or set a default recipient in .env (MAILGUN_TEST_TO) and run:
 *   bun run test:mailgun
 *
 * It sends ONE small test email and nothing else. No app data is touched.
 */
const REQUIRED = ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_FROM'] as const;

function checkEnv(): Record<(typeof REQUIRED)[number], string> | null {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('\n✗ Missing required values in your .env file:\n');
    for (const k of missing) console.error(`    - ${k}`);
    console.error('\n  Fill them in .env (see .env.example and docs/IMPLEMENTATION_PLAN.md section 3),');
    console.error('  then run this again.\n');
    return null;
  }
  return Object.fromEntries(REQUIRED.map((k) => [k, process.env[k]!])) as Record<
    (typeof REQUIRED)[number],
    string
  >;
}

async function main() {
  const env = checkEnv();
  if (!env) process.exit(1);

  // Recipient: first CLI arg wins, else MAILGUN_TEST_TO from .env.
  const to = process.argv[2] || process.env.MAILGUN_TEST_TO;
  if (!to) {
    console.error('\n✗ No recipient. Pass one as an argument or set MAILGUN_TEST_TO in .env:\n');
    console.error('    bun run test:mailgun you@example.com\n');
    process.exit(1);
  }

  // US region by default; EU accounts use https://api.eu.mailgun.net.
  const base = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net';
  const url = `${base}/v3/${env.MAILGUN_DOMAIN}/messages`;

  const form = new FormData();
  form.set('from', env.MAILGUN_FROM);
  form.set('to', to);
  form.set('subject', 'Botdoc Reports — Mailgun test ✅');
  form.set(
    'text',
    'This is a test from the Botdoc Connect Reports Mailgun POC.\n' +
      'If you received this, the Mailgun credentials work.',
  );

  console.log(`\nSending a test email to ${to} via ${env.MAILGUN_DOMAIN} ...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // Mailgun uses HTTP Basic auth: username "api", password = API key.
        Authorization: `Basic ${Buffer.from(`api:${env.MAILGUN_API_KEY}`).toString('base64')}`,
      },
      body: form,
    });

    const bodyText = await res.text();

    if (res.ok) {
      console.log('✓ Mailgun accepted the message.');
      console.log(`  Response: ${bodyText}`);
      console.log('\nSUCCESS — the Mailgun credentials work.');
      console.log('  -> Check the inbox (and spam) for the test email.\n');
      return;
    }

    console.error(`\n✗ Mailgun rejected the request (HTTP ${res.status}).\n`);
    console.error(`  Response: ${bodyText}\n`);
    console.error('  Common causes:');
    console.error('   - 401 Unauthorized -> wrong MAILGUN_API_KEY, or EU account using the US');
    console.error('     base URL (set MAILGUN_BASE_URL=https://api.eu.mailgun.net).');
    console.error('   - 404 Not Found -> MAILGUN_DOMAIN is wrong or not added in Mailgun.');
    console.error('   - "Sandbox" domain -> recipients must be added as Authorized Recipients,');
    console.error('     or verify your own domain to send to anyone.');
    console.error('   - 400 on "from" -> MAILGUN_FROM must use your verified domain.\n');
    process.exitCode = 1;
  } catch (err) {
    console.error('\n✗ Could not reach Mailgun.\n');
    console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
    console.error('  Check your network and that MAILGUN_BASE_URL is correct (US vs EU).\n');
    process.exitCode = 1;
  }
}

void main();
