import User from '../models/User.js';

export async function generateUniqueUserCode(prefix = 'USR') {
  const year = new Date().getFullYear();
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    code = `${prefix}-${year}-${rand}`;
    const existing = await User.findOne({
      $or: [{ user_code: code }, { employee_id: code }],
      is_deleted: { $ne: true }
    });
    if (!existing) isUnique = true;
  }

  return code;
}

export async function resolveUserByCode(code) {
  if (!code?.trim()) return null;
  const normalized = code.trim().toUpperCase();
  return User.findOne({
    $or: [{ user_code: normalized }, { employee_id: normalized }],
    is_deleted: { $ne: true }
  }).populate('role');
}
