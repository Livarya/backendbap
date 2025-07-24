const mongoose = require('mongoose');

const LaporanSchema = new mongoose.Schema({
  nama_merk: { type: String, required: true },
  npwpd: { type: String, required: true },
  alamat: { type: String, required: true },
  hasil_pemeriksaan: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Belum Dicek', 'Disetujui', 'Ditolak'], default: 'Belum Dicek' },
  catatan: { type: String }, // Catatan dari admin saat menyetujui/menolak
  tanggal: { type: Date, default: Date.now },
  foto: [{ type: String }],
  latitude: { type: Number },
  longitude: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('Laporan', LaporanSchema); 