const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const upload = multer({
  dest: path.join(__dirname, '../uploads'),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus gambar'));
    }
    cb(null, true);
  }
});
const {
  createLaporan,
  getUserLaporan,
  getAllLaporan,
  getLaporanById,
  updateStatusLaporan,
  deleteLaporan,
  generateAndSendPdf
} = require('../controllers/laporanController');

router.post('/upload', auth, upload.array('foto', 4), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ msg: 'No file uploaded' });
  if (req.files.length > 4) return res.status(400).json({ msg: 'Maksimal 4 foto' });
  res.json({ filenames: req.files.map(f => f.filename) });
});

router.post('/', auth, upload.array('foto', 4), createLaporan);
router.get('/user', auth, getUserLaporan);
router.get('/', auth, getAllLaporan);
router.get('/:id', auth, getLaporanById);
router.put('/:id/status', auth, isAdmin, updateStatusLaporan);
router.delete('/:id', auth, deleteLaporan);

// Route untuk generate dan kirim PDF via WhatsApp
router.post('/:id/send-pdf', auth, isAdmin, generateAndSendPdf);

module.exports = router; 