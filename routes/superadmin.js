const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/role');
const { getAllUsers, getUserById, updateUserById, deleteUser } = require('../controllers/userController');
const { getLogs } = require('../controllers/logController');

// Manajemen Data Pengguna (Superadmin Only)
router.get('/users', auth, isSuperAdmin, getAllUsers);
router.get('/users/:id', auth, isSuperAdmin, getUserById);
router.put('/users/:id', auth, isSuperAdmin, updateUserById); // Akan diubah agar bisa edit user lain
router.delete('/users/:id', auth, isSuperAdmin, deleteUser);
router.get('/logs', auth, isSuperAdmin, getLogs);

module.exports = router; 