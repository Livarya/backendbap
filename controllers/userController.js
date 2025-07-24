const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { nip, nama, jabatan, email, whatsappNumber } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { nip, nama, jabatan, email, whatsappNumber },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: 'Semua field wajib diisi' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: 'Konfirmasi password tidak cocok' });
    }
    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Password lama salah' });
    }
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ msg: 'Password berhasil diubah' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateUserById = async (req, res) => {
  try {
    const { nama, email, password, role, status } = req.body;
    const updateFields = { nama, email, role, status };
    if (password) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updateFields.password = await bcrypt.hash(password, salt);
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');
    if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User tidak ditemukan' });
    res.json({ msg: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
}; 