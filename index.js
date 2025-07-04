import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom }                                              from '@hapi/boom';
import fs                                                    from 'fs';
import path                                                  from 'path';
import { fileURLToPath }                                     from 'url';
import process                                               from 'process';

// ── helpers ────────────────────────────────────────────────
const __filename  = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, 'session');

// Ensure session directory exists
fs.mkdirSync(SESSION_DIR, { recursive: true });

// Put **your full international number** here, digits only, NO “+”
const PHONE_NUMBER   = '254738701209';      // ←←← REPLACE ME
const BOT_NAME       = 'HavocBot';
const MAX_RETRIES    = 3;                   // don’t loop forever

// ── main ───────────────────────────────────────────────────
async function startHavocBot (attempt = 1) {38701209
  console.log(`\n☢️  HavocBot – connect attempt ${attempt}/${MAX_RETRIES}`);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: [BOT_NAME, 'Render', '1.0.0'],
    connectTimeoutMs: 25_000
  });

  sock.ev.on('creds.update', saveCreds);

  // Display every reconnect/close reason
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log(`❌ Connection closed (${reason}).`);
    }
  });

  // Try to fetch a Pair‑Code as soon as the socket is up
  sock.ev.once('connection.update', async ({ connection }) => {
    if (connection !== 'open') return;

    try {
      const { pairingCode, ref } = await sock.requestPairingCode(PHONE_NUMBER);
      console.log('\n🔗 Your HavocBot Pair Code:', pairingCode);
      console.log('   Reference       :', ref);
      console.log(
        '\n> On WhatsApp, open  Settings → Linked Devices → Link a device → “Enter code” and type the 6 digits above.'
      );
    } catch (err) {
      console.error('❌ Failed to get pair code:', err.message || err);
      if (attempt < MAX_RETRIES) {
        // Wait 3 s and retry cleanly
        setTimeout(() => startHavocBot(attempt + 1), 3_000);
      } else {
        console.error('❌ Max retries reached – exiting.');
        process.exit(1);
      }
    }
  });
}

startHavocBot().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
