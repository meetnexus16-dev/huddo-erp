const ADMIN_ROLE_NAMES = new Set(['Founder', 'CEO', 'Admin']);

export function isAdminUser(user) {
  if (!user) return false;
  const roleName = user.roleName || user.role?.name || '';
  return ADMIN_ROLE_NAMES.has(roleName);
}

export function requireAdminUser(req, res, next) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only administrators can reassign managers or retailers.'
    });
  }
  return next();
}
