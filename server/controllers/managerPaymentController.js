import ManagerPayment from '../models/ManagerPayment.js';
import CommissionRecord from '../models/CommissionRecord.js';

export const listManagerPayments = async (req, res, next) => {
  try {
    const { user_id: userId, payment_type: paymentType } = req.query;
    const filter = { is_deleted: { $ne: true } };

    const roleName = req.user.role?.name || req.user.roleName;
    const managerRoles = ['CountryManager', 'StateManager', 'CityManager', 'Promoter', 'Founder', 'Admin'];
    if (!['Founder', 'Admin', 'CEO'].includes(roleName)) {
      filter.user = req.user._id;
    } else if (userId) {
      filter.user = userId;
    }

    if (paymentType) filter.payment_type = paymentType;

    const rows = await ManagerPayment.find(filter)
      .populate('user', 'name user_code roleName')
      .populate('retailer', 'business_name owner_name')
      .populate('recorded_by', 'name')
      .sort({ payment_date: -1 });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

export const createManagerPayment = async (req, res, next) => {
  try {
    const { user_id: userId, amount, payment_date: paymentDate, reference, notes, payment_type: paymentType, commission_record_ids: commissionRecordIds } = req.body;

    if (!userId || !amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'user_id, amount, and payment_date are required.' });
    }

    const payment = await ManagerPayment.create({
      user: userId,
      amount: Number(amount),
      payment_date: new Date(paymentDate),
      reference,
      notes,
      payment_type: paymentType || 'CommissionSettlement',
      recorded_by: req.user._id,
      commission_records: commissionRecordIds || []
    });

    if (commissionRecordIds?.length) {
      await CommissionRecord.updateMany(
        { _id: { $in: commissionRecordIds } },
        { $set: { status: 'Paid', settlement_date: new Date(paymentDate) } }
      );
    }

    const populated = await ManagerPayment.findById(payment._id)
      .populate('user', 'name user_code roleName')
      .populate('recorded_by', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};
