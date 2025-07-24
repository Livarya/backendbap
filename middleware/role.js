exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ msg: 'Akses hanya untuk admin/superadmin' });
  }
  next();
};

exports.isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ msg: 'Akses hanya untuk superadmin' });
  }
  next();
};