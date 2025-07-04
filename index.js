import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createServer } from 'http'
import qrcode from 'qrcode-terminal'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        printQRInTerminal: false, // ❌ no QR
        auth: state,
        browser: ['Havoc', 'Chrome', '1.0.0']
    })

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr, pairingCode }) => {
        if (pairingCode) {
            console.log(`🔗 Pair code: ${pairingCode}`)
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            if (shouldReconnect) startBot()
        }
    })

    sock.ev.on('creds.update', saveCreds)
}

startBot()
