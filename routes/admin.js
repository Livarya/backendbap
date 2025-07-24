const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
const Laporan = require('../models/Laporan');
const User = require('../models/User');

// Endpoint stats admin
router.get('/stats', auth, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalLaporan = await Laporan.countDocuments();
    const laporanBaru = await Laporan.countDocuments({ status: 'Belum Dicek' });
    res.json({ totalUsers, totalLaporan, laporanBaru });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Endpoint recent laporan
router.get('/recent-laporan', auth, isAdmin, async (req, res) => {
  try {
    const recent = await Laporan.find().sort({ createdAt: -1 }).limit(5).populate('user', 'nama username jabatan');
    res.json(recent);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router; 