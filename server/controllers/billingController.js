import Retailer from '../models/Retailer.js';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import ManagerPayment from '../models/ManagerPayment.js';

const round = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function resolveRetailerForRequest(req, retailerIdParam) {
  if (retailerIdParam) {
    return Retailer.findById(retailerIdParam).populate('user');
  }
  return Retailer.findOne({ user: req.user._id, is_deleted: { $ne: true } }).populate('user');
}

export const getRetailerBillingSummary = async (req, res, next) => {
  try {
    const retailer = await resolveRetailerForRequest(req, req.query.retailer_id);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer profile not found.' });
    }

    const roleName = req.user.role?.name || req.user.roleName;
    const isAdmin = ['Founder', 'Admin', 'CEO', 'FinanceManager'].includes(roleName);
    if (!isAdmin && retailer.user?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const [invoices, orders, adminPayments] = await Promise.all([
      Invoice.find({ retailer: retailer._id, is_deleted: { $ne: true } })
        .populate('order')
        .sort({ createdAt: -1 }),
      Order.find({ retailer: retailer._id, is_deleted: { $ne: true } })
        .sort({ createdAt: -1 }),
      ManagerPayment.find({
        user: retailer.user?._id || retailer.user,
        payment_type: 'RetailerPayment',
        is_deleted: { $ne: true }
      }).sort({ payment_date: -1 })
    ]);

    const unpaidInvoices = invoices.filter((inv) => !inv.is_paid);
    const totalOutstanding = round(unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0));
    const totalInvoiced = round(invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0));

    const orderPayments = orders
      .filter((o) => o.utr_number)
      .map((o) => ({
        source: 'order',
        date: o.createdAt,
        amount: o.grand_total || o.subtotal || 0,
        reference: o.utr_number,
        order_number: o.order_number,
        status: o.payment_status || 'Pending',
        order_id: o._id
      }));

    const recordedPayments = adminPayments.map((p) => ({
      source: 'admin',
      date: p.payment_date || p.createdAt,
      amount: p.amount,
      reference: p.reference || 'Admin Payment',
      notes: p.notes,
      status: 'Recorded',
      payment_id: p._id
    }));

    const paymentHistory = [...orderPayments, ...recordedPayments].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const verifiedOrderTotal = round(
      orders
        .filter((o) => o.payment_status === 'Verified')
        .reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0)
    );
    const adminPaymentTotal = round(adminPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0));
    const paidInvoicesTotal = round(
      invoices.filter((inv) => inv.is_paid).reduce((sum, inv) => sum + Number(inv.total || 0), 0)
    );

    res.status(200).json({
      success: true,
      data: {
        retailer: {
          _id: retailer._id,
          business_name: retailer.business_name,
          owner_name: retailer.owner_name
        },
        invoices,
        orders,
        summary: {
          total_invoiced: totalInvoiced,
          total_outstanding: totalOutstanding,
          unpaid_invoice_count: unpaidInvoices.length,
          verified_order_payments: verifiedOrderTotal,
          admin_payments_total: adminPaymentTotal,
          paid_invoices_total: paidInvoicesTotal,
          overdue_count: unpaidInvoices.filter((inv) => inv.payment_due_date && new Date(inv.payment_due_date) < new Date()).length
        },
        payment_history: paymentHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

export const recordRetailerPayment = async (req, res, next) => {
  try {
    const {
      retailer_id: retailerId,
      amount,
      payment_date: paymentDate,
      reference,
      notes,
      mark_invoices_paid: markInvoicesPaid
    } = req.body;

    if (!retailerId || !amount || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'retailer_id, amount, and payment_date are required.'
      });
    }

    const retailer = await Retailer.findById(retailerId).populate('user');
    if (!retailer?.user) {
      return res.status(404).json({ success: false, message: 'Retailer not found.' });
    }

    const payment = await ManagerPayment.create({
      user: retailer.user._id || retailer.user,
      retailer: retailer._id,
      amount: Number(amount),
      payment_date: new Date(paymentDate),
      reference,
      notes,
      payment_type: 'RetailerPayment',
      recorded_by: req.user._id
    });

    let invoicesUpdated = 0;
    if (markInvoicesPaid !== false) {
      let remaining = Number(amount);
      const unpaid = await Invoice.find({
        retailer: retailer._id,
        is_paid: false,
        is_deleted: { $ne: true }
      }).sort({ payment_due_date: 1, createdAt: 1 });

      for (const inv of unpaid) {
        if (remaining <= 0) break;
        const invTotal = Number(inv.total || 0);
        if (remaining >= invTotal) {
          inv.is_paid = true;
          inv.paid_at = new Date(paymentDate);
          await inv.save();
          remaining -= invTotal;
          invoicesUpdated += 1;
        }
      }
    }

    const populated = await ManagerPayment.findById(payment._id)
      .populate('user', 'name user_code')
      .populate('retailer', 'business_name')
      .populate('recorded_by', 'name');

    res.status(201).json({
      success: true,
      message: `Payment recorded${invoicesUpdated ? `; ${invoicesUpdated} invoice(s) marked paid.` : '.'}`,
      data: populated,
      invoices_updated: invoicesUpdated
    });
  } catch (error) {
    next(error);
  }
};

export const listRetailerPaymentsAdmin = async (req, res, next) => {
  try {
    const filter = {
      payment_type: 'RetailerPayment',
      is_deleted: { $ne: true }
    };
    if (req.query.retailer_id) filter.retailer = req.query.retailer_id;

    const rows = await ManagerPayment.find(filter)
      .populate('user', 'name user_code')
      .populate('retailer', 'business_name owner_name')
      .populate('recorded_by', 'name')
      .sort({ payment_date: -1 });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};
