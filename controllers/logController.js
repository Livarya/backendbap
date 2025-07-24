const Log = require('../models/Log');

exports.getLogs = async (req, res) => {
  try {
    const logs = await Log.find()
      .populate('petugas', 'nama username')
      .populate('laporan', 'nama_merk npwpd')
      .sort({ waktu: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}; 