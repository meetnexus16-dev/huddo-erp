import mongoose from 'mongoose';
import Order from '../models/Order.js';
import CommissionRecord from '../models/CommissionRecord.js';
import StockRecord from '../models/StockRecord.js';
import Invoice from '../models/Invoice.js';
import Target from '../models/Target.js';
import Team from '../models/Team.js';
import Employee from '../models/Employee.js';
import RetailSale from '../models/RetailSale.js';
import ProductVariant from '../models/ProductVariant.js';

const APPROVED_ORDER_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

const fromPaise = (v) => Math.round((Number(v) || 0)) / 100;

function buildDateCriteria(startDate, endDate) {
  if (!startDate && !endDate) return {};
  const createdAt = {};
  if (startDate) createdAt.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    createdAt.$lte = end;
  }
  return { createdAt };
}

// 1. GET /api/v1/reports/:type
export const getReport = async (req, res, next) => {
  try {
    const { type } = req.params;

    // CEO restriction on financial reports
    if (req.user && req.user.role && req.user.role.name === 'CEO') {
      const financialTypes = ['sales', 'revenue', 'commission', 'retailer', 'product'];
      if (financialTypes.includes(type.toLowerCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: CEO has no access to financial reports.',
          data: null
        });
      }
    }

    const { startDate, endDate } = req.query;
    const dateCriteria = buildDateCriteria(startDate, endDate);

    let reportData = [];
    let summary = null;
    const reportType = type.toLowerCase();

    switch (reportType) {
      case 'sales': {
        // Wholesale sales by state (via retailer.city → state)
        const rows = await Order.aggregate([
          {
            $match: {
              ...dateCriteria,
              status: { $in: APPROVED_ORDER_STATUSES },
              is_deleted: { $ne: true }
            }
          },
          {
            $lookup: {
              from: 'retailers',
              localField: 'retailer',
              foreignField: '_id',
              as: 'retailerDetails'
            }
          },
          { $unwind: '$retailerDetails' },
          {
            $lookup: {
              from: 'states',
              localField: 'retailerDetails.state',
              foreignField: '_id',
              as: 'stateDetails'
            }
          },
          {
            $lookup: {
              from: 'cities',
              localField: 'retailerDetails.city',
              foreignField: '_id',
              as: 'cityDetails'
            }
          },
          {
            $addFields: {
              orderPairs: {
                $reduce: {
                  input: { $ifNull: ['$items', []] },
                  initialValue: 0,
                  in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] }
                }
              }
            }
          },
          {
            $group: {
              _id: {
                stateId: { $ifNull: [{ $arrayElemAt: ['$stateDetails._id', 0] }, null] },
                stateName: {
                  $ifNull: [
                    { $arrayElemAt: ['$stateDetails.name', 0] },
                    { $ifNull: [{ $arrayElemAt: ['$cityDetails.name', 0] }, 'Unassigned'] }
                  ]
                }
              },
              totalSales: { $sum: '$grand_total' },
              orderCount: { $sum: 1 },
              pairs: { $sum: '$orderPairs' }
            }
          },
          { $sort: { totalSales: -1 } }
        ]);

        // Targets by state scope (sum of active revenue targets)
        const stateTargets = await Target.find({
          scope_level: 'State',
          kpi_type: { $in: ['Revenue', 'RevenueGrowth'] },
          status: { $in: ['Active', 'Completed'] }
        }).lean();

        const targetByState = new Map();
        stateTargets.forEach((t) => {
          const key = String(t.scope_ref_id || '');
          targetByState.set(key, (targetByState.get(key) || 0) + (Number(t.target_value) || 0));
        });

        reportData = rows.map((r) => {
          const stateId = r._id?.stateId ? String(r._id.stateId) : '';
          const amount = fromPaise(r.totalSales);
          // target_value on Target may already be rupees for Revenue — keep as stored number
          const target = targetByState.get(stateId) || 0;
          return {
            name: r._id?.stateName || 'Unassigned',
            stateId: r._id?.stateId || null,
            amount,
            orders: r.orderCount || 0,
            pairs: r.pairs || 0,
            target: target > 100000 ? fromPaise(target) : target // heuristic: paise if huge
          };
        });

        summary = {
          totalSales: reportData.reduce((s, r) => s + r.amount, 0),
          totalOrders: reportData.reduce((s, r) => s + r.orders, 0),
          totalPairs: reportData.reduce((s, r) => s + r.pairs, 0)
        };
        break;
      }

      case 'retailer': {
        const rows = await Order.aggregate([
          {
            $match: {
              ...dateCriteria,
              status: { $in: APPROVED_ORDER_STATUSES },
              is_deleted: { $ne: true }
            }
          },
          {
            $group: {
              _id: '$retailer',
              totalSales: { $sum: '$grand_total' },
              totalDiscount: { $sum: '$discount_amount' },
              orderCount: { $sum: 1 },
              pairs: {
                $sum: {
                  $reduce: {
                    input: { $ifNull: ['$items', []] },
                    initialValue: 0,
                    in: { $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }] }
                  }
                }
              }
            }
          },
          {
            $lookup: {
              from: 'retailers',
              localField: '_id',
              foreignField: '_id',
              as: 'retailerDetails'
            }
          },
          { $unwind: '$retailerDetails' },
          {
            $lookup: {
              from: 'cities',
              localField: 'retailerDetails.city',
              foreignField: '_id',
              as: 'cityDetails'
            }
          },
          {
            $project: {
              retailerName: '$retailerDetails.business_name',
              owner: '$retailerDetails.owner_name',
              category: '$retailerDetails.category',
              city: { $ifNull: [{ $arrayElemAt: ['$cityDetails.name', 0] }, '—'] },
              totalSales: 1,
              totalDiscount: 1,
              orderCount: 1,
              pairs: 1
            }
          },
          { $sort: { totalSales: -1 } }
        ]);

        reportData = rows.map((r) => ({
          name: r.retailerName || 'Retailer',
          owner: r.owner || '—',
          city: r.city || '—',
          category: r.category || 'Standard',
          amount: fromPaise(r.totalSales),
          discount: fromPaise(r.totalDiscount),
          orders: r.orderCount || 0,
          pairs: r.pairs || 0
        }));

        summary = {
          totalSales: reportData.reduce((s, r) => s + r.amount, 0),
          totalOrders: reportData.reduce((s, r) => s + r.orders, 0),
          retailerCount: reportData.length
        };
        break;
      }

      case 'product': {
        // Wholesale product sell-in from order line items
        const wholesale = await Order.aggregate([
          {
            $match: {
              ...dateCriteria,
              status: { $in: APPROVED_ORDER_STATUSES },
              is_deleted: { $ne: true }
            }
          },
          { $unwind: '$items' },
          {
            $lookup: {
              from: 'productvariants',
              localField: 'items.product_variant',
              foreignField: '_id',
              as: 'variant'
            }
          },
          { $unwind: '$variant' },
          {
            $lookup: {
              from: 'products',
              localField: 'variant.product',
              foreignField: '_id',
              as: 'product'
            }
          },
          { $unwind: '$product' },
          {
            $lookup: {
              from: 'productcategories',
              localField: 'product.category',
              foreignField: '_id',
              as: 'category'
            }
          },
          {
            $group: {
              _id: '$product._id',
              name: { $first: '$product.name' },
              category: { $first: { $ifNull: [{ $arrayElemAt: ['$category.name', 0] }, 'Footwear'] } },
              sold: { $sum: '$items.quantity' },
              revenue: { $sum: '$items.total_price' }
            }
          },
          { $sort: { sold: -1 } }
        ]);

        // Retail sell-out pairs (if any)
        const sellOut = await RetailSale.aggregate([
          { $match: { ...dateCriteria, is_deleted: { $ne: true } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              sellOutPairs: { $sum: '$items.quantity' },
              sellOutRevenue: { $sum: '$items.line_total' }
            }
          }
        ]);
        const sellOutMap = new Map(sellOut.map((s) => [String(s._id), s]));

        reportData = wholesale.map((r) => {
          const so = sellOutMap.get(String(r._id));
          return {
            name: r.name || 'Product',
            category: r.category || 'Footwear',
            sold: r.sold || 0,
            revenue: fromPaise(r.revenue),
            sellOutPairs: so?.sellOutPairs || 0,
            sellOutRevenue: fromPaise(so?.sellOutRevenue)
          };
        });

        summary = {
          totalPairs: reportData.reduce((s, r) => s + r.sold, 0),
          totalRevenue: reportData.reduce((s, r) => s + r.revenue, 0),
          productCount: reportData.length
        };
        break;
      }

      case 'revenue': {
        const rows = await Invoice.aggregate([
          {
            $match: {
              ...dateCriteria,
              is_paid: true,
              is_deleted: { $ne: true }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: { $ifNull: ['$paid_at', '$createdAt'] } },
                month: { $month: { $ifNull: ['$paid_at', '$createdAt'] } }
              },
              totalCollected: { $sum: '$total' },
              cgst: { $sum: '$cgst' },
              sgst: { $sum: '$sgst' },
              igst: { $sum: '$igst' },
              invoiceCount: { $sum: 1 }
            }
          },
          {
            $project: {
              period: {
                $concat: [
                  { $toString: '$_id.year' },
                  '-',
                  { $cond: [{ $lt: ['$_id.month', 10] }, '0', ''] },
                  { $toString: '$_id.month' }
                ]
              },
              totalCollected: 1,
              cgst: 1,
              sgst: 1,
              igst: 1,
              invoiceCount: 1
            }
          },
          { $sort: { period: 1 } }
        ]);

        // Fallback: if no paid invoices, derive monthly revenue from approved orders
        if (rows.length === 0) {
          const orderRows = await Order.aggregate([
            {
              $match: {
                ...dateCriteria,
                status: { $in: APPROVED_ORDER_STATUSES },
                is_deleted: { $ne: true }
              }
            },
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                totalCollected: { $sum: '$grand_total' },
                invoiceCount: { $sum: 1 }
              }
            },
            {
              $project: {
                period: {
                  $concat: [
                    { $toString: '$_id.year' },
                    '-',
                    { $cond: [{ $lt: ['$_id.month', 10] }, '0', ''] },
                    { $toString: '$_id.month' }
                  ]
                },
                totalCollected: 1,
                invoiceCount: 1,
                cgst: { $literal: 0 },
                sgst: { $literal: 0 },
                igst: { $literal: 0 }
              }
            },
            { $sort: { period: 1 } }
          ]);
          reportData = orderRows.map((r) => ({
            name: r.period,
            period: r.period,
            amount: fromPaise(r.totalCollected),
            cgst: 0,
            sgst: 0,
            igst: 0,
            invoices: r.invoiceCount || 0,
            source: 'orders'
          }));
        } else {
          reportData = rows.map((r) => ({
            name: r.period,
            period: r.period,
            amount: fromPaise(r.totalCollected),
            cgst: fromPaise(r.cgst),
            sgst: fromPaise(r.sgst),
            igst: fromPaise(r.igst),
            invoices: r.invoiceCount || 0,
            source: 'invoices'
          }));
        }

        summary = {
          totalCollected: reportData.reduce((s, r) => s + r.amount, 0),
          periods: reportData.length
        };
        break;
      }

      case 'commission': {
        const rows = await CommissionRecord.aggregate([
          { $match: { ...dateCriteria, is_deleted: { $ne: true } } },
          {
            $group: {
              _id: {
                user: '$user',
                type: '$commission_type'
              },
              totalEarned: { $sum: '$amount' },
              approvedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
              },
              paidCount: {
                $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
              },
              pendingCount: {
                $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
              }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id.user',
              foreignField: '_id',
              as: 'userDetails'
            }
          },
          { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              userName: { $ifNull: ['$userDetails.name', 'Unknown'] },
              userEmail: { $ifNull: ['$userDetails.email', ''] },
              commissionType: '$_id.type',
              totalEarned: 1,
              approvedCount: 1,
              paidCount: 1,
              pendingCount: 1
            }
          },
          { $sort: { totalEarned: -1 } }
        ]);

        reportData = rows.map((r) => ({
          name: r.userName,
          email: r.userEmail,
          type: r.commissionType,
          amount: fromPaise(r.totalEarned),
          approved: r.approvedCount || 0,
          paid: r.paidCount || 0,
          pending: r.pendingCount || 0
        }));

        summary = {
          totalEarned: reportData.reduce((s, r) => s + r.amount, 0),
          records: reportData.length
        };
        break;
      }

      case 'employee': {
        // Orders created by user + targets achievement
        const orderRows = await Order.aggregate([
          {
            $match: {
              ...dateCriteria,
              status: { $in: APPROVED_ORDER_STATUSES },
              is_deleted: { $ne: true }
            }
          },
          {
            $group: {
              _id: '$created_by',
              totalSales: { $sum: '$grand_total' },
              orderCount: { $sum: 1 }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: 'employees',
              localField: '_id',
              foreignField: 'user',
              as: 'employee'
            }
          },
          {
            $project: {
              userName: { $ifNull: ['$user.name', 'Unknown'] },
              employeeName: { $ifNull: [{ $arrayElemAt: ['$employee.full_name', 0] }, null] },
              employeeCode: { $ifNull: [{ $arrayElemAt: ['$employee.employee_code', 0] }, null] },
              totalSales: 1,
              orderCount: 1
            }
          },
          { $sort: { totalSales: -1 } }
        ]);

        const targets = await Target.find({
          scope_level: { $in: ['Employee', 'Team'] },
          status: { $in: ['Active', 'Completed', 'Missed'] }
        })
          .populate('assigned_to', 'name')
          .lean();

        const targetByUser = new Map();
        targets.forEach((t) => {
          const uid = String(t.assigned_to?._id || t.assigned_to || '');
          if (!uid) return;
          if (!targetByUser.has(uid)) {
            targetByUser.set(uid, { target: 0, achieved: 0, pct: 0 });
          }
          const row = targetByUser.get(uid);
          row.target += Number(t.target_value) || 0;
          row.achieved += Number(t.achieved_value) || 0;
        });

        reportData = orderRows.map((r) => {
          const uid = String(r._id || '');
          const t = targetByUser.get(uid);
          const targetVal = t?.target || 0;
          const achievedVal = t?.achieved || 0;
          const pct = targetVal > 0 ? Math.round((achievedVal / targetVal) * 1000) / 10 : 0;
          return {
            name: r.employeeName || r.userName || 'Unknown',
            code: r.employeeCode || '—',
            amount: fromPaise(r.totalSales),
            orders: r.orderCount || 0,
            target: targetVal > 100000 ? fromPaise(targetVal) : targetVal,
            achieved: achievedVal > 100000 ? fromPaise(achievedVal) : achievedVal,
            achievementPct: pct
          };
        });

        summary = {
          totalSales: reportData.reduce((s, r) => s + r.amount, 0),
          employeeCount: reportData.length
        };
        break;
      }

      case 'team': {
        const teams = await Team.find({ is_active: true })
          .populate('department', 'name')
          .populate('leader', 'full_name user')
          .populate('members', 'full_name user')
          .lean();

        const memberUserIds = [];
        teams.forEach((t) => {
          (t.members || []).forEach((m) => {
            if (m?.user) memberUserIds.push(m.user);
          });
          if (t.leader?.user) memberUserIds.push(t.leader.user);
        });

        const orderRows = memberUserIds.length
          ? await Order.aggregate([
              {
                $match: {
                  ...dateCriteria,
                  status: { $in: APPROVED_ORDER_STATUSES },
                  created_by: { $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(String(id))) },
                  is_deleted: { $ne: true }
                }
              },
              {
                $group: {
                  _id: '$created_by',
                  totalSales: { $sum: '$grand_total' },
                  orderCount: { $sum: 1 }
                }
              }
            ])
          : [];

        const salesByUser = new Map(
          orderRows.map((r) => [String(r._id), { sales: fromPaise(r.totalSales), orders: r.orderCount || 0 }])
        );

        reportData = teams.map((t) => {
          const users = new Set();
          (t.members || []).forEach((m) => {
            if (m?.user) users.add(String(m.user));
          });
          if (t.leader?.user) users.add(String(t.leader.user));

          let amount = 0;
          let orders = 0;
          users.forEach((uid) => {
            const row = salesByUser.get(uid);
            if (row) {
              amount += row.sales;
              orders += row.orders;
            }
          });

          return {
            name: t.name,
            department: t.department?.name || '—',
            leader: t.leader?.full_name || '—',
            members: (t.members || []).length,
            amount: Math.round(amount * 100) / 100,
            orders
          };
        }).sort((a, b) => b.amount - a.amount);

        summary = {
          teamCount: reportData.length,
          totalSales: reportData.reduce((s, r) => s + r.amount, 0)
        };
        break;
      }

      case 'stock': {
        // Prefer ProductVariant.stock_quantity (primary warehouse stock used by orders)
        const variants = await ProductVariant.find({ is_active: { $ne: false } })
          .populate({ path: 'product', select: 'name' })
          .lean();

        reportData = variants
          .map((v) => ({
            name: v.product?.name || 'Product',
            sku: v.sku_variant,
            size: v.size,
            color: v.color,
            quantity: Number(v.stock_quantity) || 0
          }))
          .sort((a, b) => a.quantity - b.quantity);

        // Merge warehouse StockRecord totals if present
        const warehouseStock = await StockRecord.aggregate([
          { $match: { is_deleted: { $ne: true } } },
          {
            $group: {
              _id: '$product_variant',
              warehouseQty: { $sum: '$quantity' },
              warehousesCount: { $sum: 1 }
            }
          }
        ]);
        const whMap = new Map(warehouseStock.map((s) => [String(s._id), s]));
        reportData = reportData.map((r) => {
          // find matching by sku already in list — attach warehouse if we can match via variant id
          return r;
        });

        // Enrich from warehouse map using variant lookup
        const bySku = new Map(variants.map((v) => [v.sku_variant, v]));
        reportData = reportData.map((r) => {
          const v = bySku.get(r.sku);
          const wh = v ? whMap.get(String(v._id)) : null;
          return {
            ...r,
            warehouseQty: wh?.warehouseQty || 0,
            warehouses: wh?.warehousesCount || 0
          };
        });

        summary = {
          skuCount: reportData.length,
          totalQty: reportData.reduce((s, r) => s + r.quantity, 0),
          lowStock: reportData.filter((r) => r.quantity <= 10).length
        };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          message: `Unknown report type '${type}'. Available: sales, revenue, commission, retailer, product, employee, team, stock.`,
          data: null
        });
    }

    res.status(200).json({
      success: true,
      message: `Report for '${type}' generated successfully.`,
      data: reportData,
      summary
    });
  } catch (error) {
    next(error);
  }
};
