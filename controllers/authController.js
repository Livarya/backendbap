const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.register = async (req, res) => {
  console.log('REGISTER RAW BODY:', req.body);
  console.log('REGISTER BODY:', req.body);
  try {
    const { nip, nohp, nama, jabatan, username, email, password, role } = req.body;
    if (!nip || !nohp || !nama || !jabatan || !username || !email || !password) {
      console.log('REGISTER ERROR: Field kosong');
      return res.status(400).json({ msg: 'Semua field wajib diisi' });
    }
    const existingUser = await User.findOne({ $or: [ { email }, { username }, { nip } ] });
    if (existingUser) {
      console.log('REGISTER ERROR: User sudah terdaftar');
      return res.status(400).json({ msg: 'User sudah terdaftar' });
    }
    console.log('REGISTER: Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Validasi role
    const allowedRoles = ['user','admin','superadmin'];
    const finalRole = allowedRoles.includes(role) ? role : 'user';
    console.log('REGISTER ROLE:', finalRole);
    console.log('REGISTER: Membuat user baru...');
    const user = new User({ nip, nohp, nama, jabatan, username, email, password: hashedPassword, role: finalRole });
    await user.save();
    console.log('REGISTER SUCCESS:', user);
    res.status(201).json({ msg: 'Registrasi berhasil' });
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { nip, password } = req.body;
    if (!nip || !password) {
      return res.status(400).json({ msg: 'Semua field wajib diisi' });
    }
    if (!/^\d{18}$/.test(nip)) {
      return res.status(400).json({ msg: 'NIP harus 18 digit angka' });
    }
    const user = await User.findOne({ nip });
    if (!user) {
      return res.status(400).json({ msg: 'User tidak ditemukan' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Password salah' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, 'supersecretjwtkey', { expiresIn: '1d' });
    res.json({
      token,
      user: {
        nama: user.nama,
        role: user.role,
        jabatan: user.jabatan,
        email: user.email,
        username: user.username,
        nip: user.nip,
        nohp: user.nohp
      }
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ msg: 'Email wajib diisi' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'User tidak ditemukan' });

  // Generate token
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000; // 1 jam

  user.resetPasswordToken = token;
  user.resetPasswordExpires = expires;
  await user.save();

  // Kirim email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'yandikalivaryaaa@gmail.com',
      pass: 'uflt jswx doee gwly',
    },
  });

  const resetUrl = `http://localhost:3000/reset-password/${token}`;
  const mailOptions = {
    to: user.email,
    subject: 'Reset Password',
    html: `<p>Klik link berikut untuk reset password:</p><a href="${resetUrl}">${resetUrl}</a>`,
  };

  await transporter.sendMail(mailOptions);

  res.json({ msg: 'Email reset password telah dikirim' });
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) return res.status(400).json({ msg: 'Password wajib diisi' });

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) return res.status(400).json({ msg: 'Token tidak valid atau kadaluarsa' });

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ msg: 'Password berhasil direset' });
};