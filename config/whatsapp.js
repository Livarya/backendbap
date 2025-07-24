const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Inisialisasi WhatsApp client dengan autentikasi lokal
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox']
  }
});

// Generate QR Code untuk autentikasi
client.on('qr', (qr) => {
  console.log('QR CODE untuk WhatsApp:');
  qrcode.generate(qr, { small: true });
  console.log('Scan QR code di atas dengan WhatsApp Admin');
});

client.on('ready', () => {
  console.log('WhatsApp client siap! Admin dapat mengirim notifikasi.');
});

client.on('authenticated', () => {
  console.log('WhatsApp berhasil diautentikasi!');
});

client.on('auth_failure', (msg) => {
  console.error('Autentikasi WhatsApp gagal:', msg);
});

/**
 * Fungsi untuk mengirim notifikasi status laporan dari admin ke pengguna
 * @param {string} userPhone - Nomor telepon pengguna (format: 08xxx)
 * @param {string} userName - Nama pengguna
 * @param {string} status - Status laporan (Disetujui/Ditolak)
 * @param {string} reportName - Nama laporan/merk
 * @param {string} message - Pesan tambahan (opsional)
 */
const sendStatusNotification = async (userPhone, userName, status, reportName, message = '') => {
  if (!userPhone) {
    console.log('Nomor WhatsApp pengguna tidak tersedia');
    return false;
  }

  // Format nomor WhatsApp (pastikan format internasional)
  let formattedNumber = formatPhoneNumber(userPhone);

  // Siapkan pesan berdasarkan status
  let statusText = status === 'Disetujui' ? 'disetujui' : 'ditolak';
  let notifMessage = `*Notifikasi SIPERIKSA*\n\nHalo ${userName},\n\nLaporan Anda untuk *${reportName}* telah *${statusText}*.`;
  
  // Tambahkan pesan tambahan jika ada
  if (message) {
    notifMessage += `\n\nCatatan: ${message}`;
  }
  
  notifMessage += `\n\nSilakan cek detail selengkapnya di website SIPERIKSA.\n\nTerima kasih.`;

  try {
    // Periksa apakah client sudah siap
    if (!client.info) {
      console.log('WhatsApp client belum siap. Pastikan QR code sudah di-scan.');
      return false;
    }

    // Kirim pesan
    await client.sendMessage(formattedNumber, notifMessage);
    console.log(`Notifikasi WhatsApp terkirim ke ${userPhone}`);
    return true;
  } catch (error) {
    console.error(`Gagal mengirim notifikasi WhatsApp:`, error);
    return false;
  }
};

/**
 * Fungsi untuk mengirim file PDF laporan ke pengguna
 * @param {string} userPhone - Nomor telepon pengguna (format: 08xxx)
 * @param {string} userName - Nama pengguna
 * @param {string} reportName - Nama laporan/merk
 * @param {string} filePath - Path ke file PDF
 * @param {string} caption - Caption untuk file (opsional)
 */
const sendPdfReport = async (userPhone, userName, reportName, filePath, caption = '') => {
  if (!userPhone) {
    console.log('Nomor WhatsApp pengguna tidak tersedia');
    return false;
  }

  // Format nomor WhatsApp
  let formattedNumber = formatPhoneNumber(userPhone);

  // Siapkan caption default jika tidak ada
  if (!caption) {
    caption = `*Laporan SIPERIKSA*\n\nHalo ${userName},\n\nBerikut adalah file PDF laporan untuk *${reportName}*.\n\nTerima kasih.`;
  }

  try {
    // Periksa apakah client sudah siap
    if (!client.info) {
      console.log('WhatsApp client belum siap. Pastikan QR code sudah di-scan.');
      return false;
    }

    // Periksa apakah file ada
    if (!fs.existsSync(filePath)) {
      console.error(`File tidak ditemukan: ${filePath}`);
      return false;
    }

    // Buat media dari file
    const media = MessageMedia.fromFilePath(filePath);
    
    // Kirim media dengan caption
    await client.sendMessage(formattedNumber, media, { caption });
    console.log(`File PDF berhasil dikirim ke ${userPhone}`);
    return true;
  } catch (error) {
    console.error(`Gagal mengirim file PDF:`, error);
    return false;
  }
};

/**
 * Helper function untuk memformat nomor telepon
 * @param {string} phoneNumber - Nomor telepon (format: 08xxx)
 * @returns {string} - Nomor telepon dalam format @c.us
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  if (phoneNumber.includes('@c.us')) {
    return phoneNumber;
  }
  
  // Hapus karakter non-digit
  let formattedNumber = phoneNumber.replace(/\D/g, '');
  
  // Pastikan format internasional (untuk Indonesia)
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '62' + formattedNumber.substring(1);
  }
  
  return formattedNumber + '@c.us';
};

// Inisialisasi client
const initWhatsApp = () => {
  client.initialize().catch(err => {
    console.error('Gagal menginisialisasi WhatsApp client:', err);
  });
};

module.exports = {
  initWhatsApp,
  sendStatusNotification,
  sendPdfReport
}; 