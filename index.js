require('dotenv').config()
const {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')

async function startHavocBot() {
  // 1) ensure ./session dir exists
  fs.mkdirSync(path.join(__dirname, 'session'), { recursive: true })

  // 2) load & persist auth state
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'session'))

  // 3) create the socket
  const sock = makeWASocket({
    auth: state,
    browser: ['HavocBot', 'Chrome', '1.0.0']
  })

  // 4) whenever creds update, save them
  sock.ev.on('creds.update', saveCreds)

  // 5) request a pair‑code (and ref) right away
  try {
    const { pairingCode, ref } = await sock.requestPairingCode()
    console.log(`\n🔗 Your HavocBot Pair Code: ${pairingCode}`)
    console.log(`   Reference       : ${ref}\n`)
    console.log(`> Now open WhatsApp → Settings → Linked Devices → Link a device → Enter code above.`)
  } catch (e) {
    console.error('❌ Failed to get pair code:', e)
  }

  // 6) handle connection updates
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ HavocBot connected!')
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('Connection closed.', shouldReconnect ? 'Reconnecting…' : 'Logged out.')
      if (shouldReconnect) startHavocBot()
    }
  })

  // 7) simple message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation
               || msg.message.extendedTextMessage?.text
               || ''

    console.log('📥', from, '→', text)
    if (text.toLowerCase() === '.ping') {
      await sock.sendMessage(from, { text: '*Pong!!* HavocBot is alive ⚡' }, { quoted: msg })
    }
  })
}

// kick things off
startHavocBot()
