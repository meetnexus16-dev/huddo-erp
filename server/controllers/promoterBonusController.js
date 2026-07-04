import PromoterBonusStructure, { PROMOTED_ROLES } from '../models/PromoterBonusStructure.js';

export const listPromoterBonusStructures = async (req, res, next) => {
  try {
    const rows = await PromoterBonusStructure.find({ is_deleted: { $ne: true } })
      .populate('product_category', 'name code')
      .sort({ promoted_role: 1, product_category: 1 });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const upsertPromoterBonusStructure = async (req, res, next) => {
  try {
    const { id, promoted_role: promotedRole, product_category: productCategory, extra_bonus_percentage: extraBonus, description, is_active: isActive } = req.body;

    if (!promotedRole || !PROMOTED_ROLES.includes(promotedRole)) {
      return res.status(400).json({ success: false, message: 'Valid promoted_role is required.' });
    }

    const payload = {
      promoted_role: promotedRole,
      product_category: productCategory || null,
      extra_bonus_percentage: Number(extraBonus || 0),
      description,
      is_active: isActive !== false
    };

    let row;
    if (id) {
      row = await PromoterBonusStructure.findByIdAndUpdate(id, payload, { new: true }).populate('product_category', 'name code');
    } else {
      row = await PromoterBonusStructure.create(payload);
      row = await row.populate('product_category', 'name code');
    }

    res.status(200).json({ success: true, data: row });
  } catch (error) {
    next(error);
  }
};

export const deletePromoterBonusStructure = async (req, res, next) => {
  try {
    await PromoterBonusStructure.findByIdAndUpdate(req.params.id, { is_deleted: true });
    res.status(200).json({ success: true, message: 'Structure deleted.' });
  } catch (error) {
    next(error);
  }
};
