const Laporan = require('../models/Laporan');
const mongoose = require('mongoose');
const Log = require('../models/Log');
const User = require('../models/User');
const { sendStatusNotification, sendPdfReport } = require('../config/whatsapp');
const path = require('path');
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const PDFDocument = require('pdfkit');

exports.createLaporan = async (req, res) => {
  try {
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);
    const { nama_merk, npwpd, alamat, hasil_pemeriksaan, latitude, longitude } = req.body;
    if (!nama_merk || !npwpd || !alamat || !hasil_pemeriksaan) {
      return res.status(400).json({ msg: 'Semua field wajib diisi', body: req.body, files: req.files });
    }
    // Ambil file dari req.files (array, karena pakai upload.array)
    let fotoArr = [];
    if (req.files && req.files.length > 0) {
      fotoArr = req.files.map(file => file.filename);
    }
    console.log('Latitude:', latitude, 'Longitude:', longitude);
    const laporan = new Laporan({
      nama_merk,
      npwpd,
      alamat,
      hasil_pemeriksaan,
      user: req.user.id,
      foto: fotoArr,
      latitude: latitude !== undefined && latitude !== '' ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== '' ? Number(longitude) : undefined
    });
    await laporan.save();
    res.status(201).json(laporan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(laporan);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find().populate('user', 'nama username jabatan').sort({ createdAt: -1 });
    res.json(laporan);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getLaporanById = async (req, res) => {
  try {
    const laporan = await Laporan.findById(req.params.id).populate('user', 'nama username jabatan');
    if (!laporan) return res.status(404).json({ msg: 'Laporan tidak ditemukan' });
    res.json(laporan);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateStatusLaporan = async (req, res) => {
  try {
    const { status, catatan } = req.body;
    if (!['Belum Dicek', 'Disetujui', 'Ditolak'].includes(status)) {
      return res.status(400).json({ msg: 'Status tidak valid' });
    }
    
    // Update laporan dengan catatan jika ada
    const updateData = { status };
    if (catatan) {
      updateData.catatan = catatan;
    }
    
    // Dapatkan laporan dengan data user
    const laporan = await Laporan.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('user');
    
    if (!laporan) return res.status(404).json({ msg: 'Laporan tidak ditemukan' });
    
    // Catat log jika status Disetujui/Ditolak
    if (status === 'Disetujui' || status === 'Ditolak') {
      await catatLog(laporan._id, status === 'Disetujui' ? 'Disetujui' : 'Ditolak', req.user.id);
      
      // Kirim notifikasi WhatsApp jika status berubah menjadi Disetujui atau Ditolak
      try {
        // Dapatkan data lengkap user
        const user = await User.findById(laporan.user._id);
        
        if (user && user.whatsappNumber) {
          // Kirim notifikasi WhatsApp
          sendStatusNotification(
            user.whatsappNumber,
            user.nama,
            status,
            laporan.nama_merk,
            catatan || '' // Kirim catatan jika ada
          ).then(sent => {
            console.log(`Notifikasi WhatsApp ${sent ? 'berhasil' : 'gagal'} dikirim ke ${user.nama}`);
          }).catch(err => {
            console.error('Error saat mengirim notifikasi WhatsApp:', err);
          });
        }
      } catch (notifErr) {
        console.error('Error saat memproses notifikasi:', notifErr);
        // Tidak menghentikan proses meskipun notifikasi gagal
      }
    }
    
    res.json(laporan);
  } catch (err) {
    console.error('Error saat update status:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteLaporan = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Delete laporan id:', id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ msg: 'ID tidak valid' });
    }
    const laporan = await Laporan.findByIdAndDelete(id);
    if (!laporan) return res.status(404).json({ msg: 'Laporan tidak ditemukan' });
    res.status(200).json({ msg: 'Laporan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}; 

exports.logActivity = async (req, res) => {
  try {
    const { laporanId, aktivitas } = req.body;
    if (!['Disetujui','Ditolak','Dicetak'].includes(aktivitas)) {
      return res.status(400).json({ msg: 'Aktivitas tidak valid' });
    }
    const log = new Log({
      petugas: req.user.id,
      laporan: laporanId,
      aktivitas
    });
    await log.save();
    res.json(log);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

// Fungsi untuk generate dan kirim PDF laporan ke WhatsApp
exports.generateAndSendPdf = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Dapatkan data laporan
    const laporan = await Laporan.findById(id).populate('user');
    if (!laporan) {
      return res.status(404).json({ msg: 'Laporan tidak ditemukan' });
    }
    
    // Dapatkan user yang membuat laporan
    const user = await User.findById(laporan.user._id);
    if (!user || !user.whatsappNumber) {
      return res.status(400).json({ msg: 'Nomor WhatsApp pengguna tidak tersedia' });
    }
    
    // Buat direktori untuk menyimpan PDF jika belum ada
    const pdfDir = path.join(__dirname, '../pdf');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    // Nama file PDF
    const pdfFilename = `laporan_${laporan._id}_${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    
    // Generate PDF
    await generatePdf(laporan, pdfPath);
    
    // Catat log aktivitas
    await catatLog(laporan._id, 'Dicetak', req.user.id);
    
    // Kirim PDF via WhatsApp
    sendPdfReport(
      user.whatsappNumber,
      user.nama,
      laporan.nama_merk,
      pdfPath,
      `*Laporan SIPERIKSA*\n\nHalo ${user.nama},\n\nBerikut adalah file PDF laporan untuk *${laporan.nama_merk}* yang telah dicetak.\n\nTerima kasih.`
    ).then(sent => {
      console.log(`PDF ${sent ? 'berhasil' : 'gagal'} dikirim ke ${user.nama}`);
    }).catch(err => {
      console.error('Error saat mengirim PDF via WhatsApp:', err);
    });
    
    // Kirim response ke client
    res.json({ 
      success: true, 
      msg: 'PDF berhasil dibuat dan dikirim ke WhatsApp pengguna',
      pdfUrl: `/pdf/${pdfFilename}`
    });
    
  } catch (err) {
    console.error('Error saat generate dan kirim PDF:', err);
    res.status(500).json({ msg: 'Server error' });
  }
};

// Helper function untuk generate PDF
async function generatePdf(laporan, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      // Buat dokumen PDF
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      
      // Pipe output ke file
      doc.pipe(fs.createWriteStream(outputPath));
      
      // Header
      doc.fontSize(20).text('LAPORAN PEMERIKSAAN', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`No. ${laporan.npwpd}`, { align: 'center' });
      doc.moveDown(2);
      
      // Informasi laporan
      doc.fontSize(12);
      
      const tableData = [
        { label: 'Nama Merk', value: laporan.nama_merk },
        { label: 'NPWPD', value: laporan.npwpd },
        { label: 'Alamat', value: laporan.alamat },
        { label: 'Hasil Pemeriksaan', value: laporan.hasil_pemeriksaan },
        { label: 'Status', value: laporan.status },
        { label: 'Tanggal', value: new Date(laporan.tanggal).toLocaleString('id-ID') },
        { label: 'Petugas', value: `${laporan.user.nama} (${laporan.user.jabatan})` }
      ];
      
      // Tambahkan catatan jika ada
      if (laporan.catatan) {
        tableData.push({ label: 'Catatan', value: laporan.catatan });
      }
      
      // Buat tabel
      let y = doc.y;
      tableData.forEach(row => {
        doc.text(row.label, 50, y);
        doc.text(':', 200, y);
        doc.text(row.value, 220, y);
        y += 20;
      });
      
      doc.moveDown(2);
      
      // Tambahkan foto jika ada
      if (laporan.foto && laporan.foto.length > 0) {
        doc.text('Dokumentasi Foto:', 50, y);
        doc.moveDown();
        y = doc.y;
        
        // Tambahkan foto (maksimal 4)
        const maxPhotos = Math.min(laporan.foto.length, 4);
        const uploadsDir = path.join(__dirname, '../uploads');
        
        // Selesaikan dokumen jika tidak ada foto yang bisa ditampilkan
        if (maxPhotos === 0) {
          doc.end();
          resolve();
          return;
        }
        
        // Hitung berapa foto yang berhasil ditambahkan
        let addedPhotos = 0;
        
        for (let i = 0; i < maxPhotos; i++) {
          const photoPath = path.join(uploadsDir, laporan.foto[i]);
          
          // Cek apakah file foto ada
          if (fs.existsSync(photoPath)) {
            try {
              // Tambahkan foto ke PDF
              doc.image(photoPath, 50 + (i % 2) * 250, y + Math.floor(i / 2) * 150, {
                width: 200,
                height: 120
              });
              
              addedPhotos++;
            } catch (err) {
              console.error(`Error menambahkan foto ${photoPath}:`, err);
            }
          }
        }
        
        // Jika tidak ada foto yang berhasil ditambahkan
        if (addedPhotos === 0) {
          doc.text('Tidak ada foto yang tersedia', 50, y);
        }
      }
      
      // Finalisasi dokumen
      doc.end();
      resolve();
      
    } catch (err) {
      reject(err);
    }
  });
}

// Helper untuk mencatat log otomatis
async function catatLog(laporanId, aktivitas, userId) {
  try {
    const log = new Log({
      petugas: userId,
      laporan: laporanId,
      aktivitas
    });
    await log.save();
  } catch {}
} 