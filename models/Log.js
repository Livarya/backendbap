const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  petugas: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  laporan: { type: mongoose.Schema.Types.ObjectId, ref: 'Laporan', required: true },
  aktivitas: { type: String, enum: ['Disetujui', 'Ditolak', 'Dicetak'], required: true },
  waktu: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema); 