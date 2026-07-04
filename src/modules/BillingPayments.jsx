import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, CheckCircle2, AlertTriangle, Send, ShieldAlert, Plus, HelpCircle, Save } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';

export default function BillingPayments({ showToast, userRole }) {
  const [activeTab, setActiveTab] = useState('invoices'); // invoices | payments | outstanding | transactions
  const [invoices, setInvoices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [outstandings, setOutstandings] = useState([]);
  const [ordersList, setOrdersList] = useState([]);

  // Generate Invoice Modal
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [billingType, setBillingType] = useState('Wholesale');

  // Customer details for retail billing
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');

  // Payment Verification Modal
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyingRecord, setVerifyingRecord] = useState(null);

  // GST percentage override inline edit state
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editingPercentage, setEditingPercentage] = useState(18);

  const [retailersList, setRetailersList] = useState([]);
  const [retailerPayments, setRetailerPayments] = useState([]);
  const [isRetailerPayOpen, setIsRetailerPayOpen] = useState(false);
  const [retailerPayForm, setRetailerPayForm] = useState({
    retailer_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  });

  const mapInvoice = (inv) => ({
    id: inv._id,
    invoiceNumber: inv.invoice_number || inv._id,
    orderId: inv.order?.order_number || inv.order?._id || inv.order || '',
    shopName: inv.retailer?.business_name || 'Walk Easy Footwear',
    amount: inv.subtotal || 0,
    tax: (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0),
    total: inv.total || 0,
    date: inv.payment_due_date ? new Date(inv.payment_due_date).toISOString().split('T')[0] : '',
    status: inv.is_paid ? 'Paid' : 'Unpaid',
    overridePercentage: inv.overridePercentage
  });

  const loadBillingData = () => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setInvoices(resData.data.map(mapInvoice));
        }
      })
      .catch(err => console.error("Error loading invoices:", err));

    fetch('/api/orders')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          // Sync orders list for select options
          setOrdersList(resData.data.map(o => ({
            id: o.order_number || o._id,
            _id: o._id,
            retailerName: o.retailer?.business_name || 'Walk Easy Footwear',
            retailerId: o.retailer?._id || o.retailer,
            amount: o.subtotal || o.amount || 0
          })));

          // Transactions matching: orders with UTR or payment screenshot submitted
          const txnOrders = resData.data.filter(o => o.utr_number || o.payment_screenshot);
          setTransactions(txnOrders.map(o => ({
            id: o._id,
            utr: o.utr_number || 'PENDING',
            amount: o.subtotal || o.amount || 0,
            date: o.updatedAt ? new Date(o.updatedAt).toISOString().split('T')[0] : '2026-06-11',
            status: o.payment_status === 'Verified' ? 'Verified' : (o.payment_status === 'Rejected' ? 'Rejected' : 'Pending Verification'),
            shopName: o.retailer?.business_name || 'Retailer Outlet',
            order: o.order_number || o._id
          })));

          // Outstanding checklist
          const unpaidOrders = resData.data.filter(o => o.payment_status !== 'Verified' && o.payment_status !== 'Paid');
          setOutstandings(unpaidOrders.map(o => ({
            id: o._id,
            shopName: o.retailer?.business_name || 'Retailer Outlet',
            city: o.retailer?.city?.name || o.retailer?.city || 'Mumbai',
            pendingAmount: o.subtotal || o.amount || 0,
            overdueDays: 5,
            lastReminder: 'Never'
          })));
        }
      })
      .catch(err => console.error("Error loading transactions:", err));

    fetch('/api/retailers?limit=100')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setRetailersList(resData.data);
        }
      })
      .catch(() => {});

    fetch('/api/billing/retailer/payments')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setRetailerPayments(resData.data.map(p => ({
            id: p._id,
            shopName: p.retailer?.business_name || p.user?.name || 'Retailer',
            amount: p.amount,
            date: p.payment_date ? new Date(p.payment_date).toISOString().split('T')[0] : '',
            reference: p.reference || '—',
            notes: p.notes || '',
            recordedBy: p.recorded_by?.name || 'Admin'
          })));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const handleGenerateInvoiceSubmit = (e) => {
    e.preventDefault();
    const matchedOrder = ordersList.find(o => o.id === selectedOrderId);
    if (!matchedOrder) return;

    if (billingType === 'Retailer') {
      if (!customerName || !customerMobile || !customerCity) {
        showToast("Please fill all required customer fields.", "error");
        return;
      }
    }

    const payload = {
      order: matchedOrder._id || matchedOrder.id,
      retailer: matchedOrder.retailerId,
      subtotal: matchedOrder.amount,
      cgst: Math.round(matchedOrder.amount * 0.09),
      sgst: Math.round(matchedOrder.amount * 0.09),
      igst: 0,
      total: Math.round(matchedOrder.amount * 1.18),
      payment_due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    };

    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          if (billingType === 'Retailer') {
            fetch('/api/billing/retailer/customer-info', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice_id: resData.data?._id || `INV-${Date.now()}`,
                customer_name: customerName,
                mobile: customerMobile,
                email: customerEmail,
                city: customerCity,
                amount: payload.total
              })
            }).catch(err => console.error(err));
          }

          showToast("GST Invoice generated successfully.", "success");
          loadBillingData();
          setIsGenerateOpen(false);
          setCustomerName('');
          setCustomerMobile('');
          setCustomerEmail('');
        } else {
          showToast(resData.message || "Failed to generate invoice.", "error");
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Error connecting to database.", "error");
      });
  };

  const handleVerifyPayment = (isApproved) => {
    const status = isApproved ? 'Verified' : 'Rejected';
    
    fetch(`/api/orders/${verifyingRecord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: status })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`Payment UTR verification completed. Status set: ${status}`, isApproved ? "success" : "error");
          loadBillingData();
          setIsVerifyOpen(false);
        } else {
          showToast("Failed to verify payment.", "error");
        }
      })
      .catch(err => console.error(err));
  };

  const handleRecordRetailerPayment = () => {
    if (!retailerPayForm.retailer_id || !retailerPayForm.amount || !retailerPayForm.payment_date) {
      showToast('Retailer, amount, and date are required.', 'error');
      return;
    }
    fetch('/api/billing/retailer/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(retailerPayForm)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(resData.message || 'Retailer payment recorded.', 'success');
          setIsRetailerPayOpen(false);
          loadBillingData();
        } else {
          showToast(resData.message || 'Failed to record payment.', 'error');
        }
      })
      .catch(() => showToast('Error recording payment.', 'error'));
  };

  const triggerReminderModal = (row) => {
    const payload = {
      title: "Outstanding payment notice",
      message: `Dear ${row.shopName}, you have an outstanding credit balance of ₹${row.pendingAmount}. Please settle immediately.`,
      category: 'Target',
      recipientRole: 'Retailer',
      channels: ['EMAIL', 'SMS']
    };

    fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`Broadcasting outstanding dues alert for ${row.shopName}.`, "success");
        } else {
          showToast("Failed to send reminder.", "error");
        }
      })
      .catch(err => console.error(err));
  };

  // Generate Invoices columns
  const invoiceColumns = [
    { header: "Invoice ID", accessor: "invoiceNumber", render: (val) => <span className="font-bold text-slate-800 font-mono">{val}</span> },
    { header: "Order Ref ID", accessor: "orderId" },
    { header: "Shop Name", accessor: "shopName", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Taxable Value", accessor: "amount", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> },
    { 
      header: "GST Tax %", 
      accessor: "overridePercentage", 
      render: (val, row) => {
        const soccerPct = row.overridePercentage || 18;
        const isEditing = editingInvoiceId === row.id;
        return (
          <div className="flex flex-col gap-1 text-[11px] text-left">
            <div className="flex items-center gap-1.5">
              {isEditing ? (
                <>
                  <input 
                    type="number" 
                    className="w-12 border border-slate-300 rounded px-1 py-0.5 text-xs font-bold focus:outline-none" 
                    value={editingPercentage} 
                    onChange={(e) => setEditingPercentage(e.target.value)} 
                    min="0"
                    max="100"
                  />
                  <span className="font-semibold">%</span>
                  <button 
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/billing/${row.id}/get-percentage`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ percentage: Number(editingPercentage) })
                        });
                        const updated = await res.json();
                        setEditingInvoiceId(null);
                        showToast(`GST percentage updated to ${editingPercentage}% for ${row.id}`, "success");
                        loadBillingData();
                      } catch (err) {
                        showToast("Failed to update percentage", "error");
                      }
                    }}
                    className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 hover:bg-emerald-100 font-semibold"
                    title="Update"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setEditingInvoiceId(null)}
                    className="px-1 py-0.5 text-[9px] text-slate-400 hover:text-slate-600 border rounded"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="font-bold text-slate-700">{soccerPct}%</span>
                  <button 
                    onClick={() => {
                      setEditingInvoiceId(row.id);
                      setEditingPercentage(soccerPct);
                    }}
                    className="text-brand-orange hover:underline text-[10px]"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              Auto: 18% | Override: {row.overridePercentage ? `${row.overridePercentage}%` : 'None'}
            </span>
          </div>
        );
      }
    },
    { 
      header: "GST Tax Amount", 
      accessor: "tax", 
      render: (val, row) => {
        if (editingInvoiceId === row.id) {
          const tempTax = Math.round(row.amount * (Number(editingPercentage) / 100)) || 0;
          return <span className="text-slate-500 font-semibold">₹{tempTax.toLocaleString('en-IN')} (Preview)</span>;
        }
        return <span className="text-slate-400">₹{val.toLocaleString('en-IN')}</span>;
      }
    },
    { 
      header: "Total Gross (₹)", 
      accessor: "total", 
      render: (val, row) => {
        if (editingInvoiceId === row.id) {
          const tempTax = Math.round(row.amount * (Number(editingPercentage) / 100)) || 0;
          const tempTotal = row.amount + tempTax;
          return <span className="font-bold text-indigo-600">₹{tempTotal.toLocaleString('en-IN')} (Preview)</span>;
        }
        return <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span>;
      }
    },
    { header: "Due Date", accessor: "date" },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {val}
      </span>
    )}
  ];

  const paymentColumns = [
    { header: "Txn ID", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono">{val}</span> },
    { header: "UTR Receipt No", accessor: "utr", render: (val) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-600">{val}</code> },
    { header: "Amount Deposited", accessor: "amount", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> },
    { header: "Timestamp", accessor: "date" },
    { header: "Order Link", accessor: "order" },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        val === 'Verified' ? 'bg-emerald-100 text-emerald-800' :
        val === 'Pending Verification' ? 'bg-amber-100 text-amber-800' :
        'bg-rose-100 text-rose-800'
      }`}>
        {val}
      </span>
    )},
    { header: "Action Gateway", accessor: "id", sortable: false, render: (val, row) => (
      row.status === 'Pending Verification' ? (
        <button 
          onClick={() => { setVerifyingRecord(row); setIsVerifyOpen(true); }}
          className="px-3 py-1 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded animate-pulse"
        >
          Verify Payment Receipt
        </button>
      ) : <span className="text-slate-400 font-semibold text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Settled Ledger</span>
    )}
  ];

  const outstandingColumns = [
    { header: "Shop Name", accessor: "shopName", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "City Region", accessor: "city" },
    { header: "Pending Amount (₹)", accessor: "pendingAmount", render: (val) => <span className="font-bold text-rose-600">₹{val.toLocaleString('en-IN')}</span> },
    { header: "Days Overdue", accessor: "overdueDays", render: (val) => <span className="font-semibold text-slate-700">{val} Days Overdue</span> },
    { header: "Last Alert Sent", accessor: "lastReminder" },
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button 
        onClick={() => triggerReminderModal(row)}
        className="flex items-center gap-1 px-3 py-1 border border-slate-200 hover:border-slate-300 rounded text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        <span>Broadcasting Reminder</span>
      </button>
    )}
  ];

  const retailerPaymentColumns = [
    { header: 'Retailer', accessor: 'shopName', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: 'Date', accessor: 'date' },
    { header: 'Amount (₹)', accessor: 'amount', render: (val) => <span className="font-bold text-emerald-600">₹{Number(val || 0).toLocaleString('en-IN')}</span> },
    { header: 'Reference', accessor: 'reference' },
    { header: 'Recorded By', accessor: 'recordedBy' },
    { header: 'Notes', accessor: 'notes' }
  ];

  const canViewAuditAndOutstanding = ['Founder', 'CEO', 'Admin', 'Finance Manager'].includes(userRole || 'Founder');

  useEffect(() => {
    if (!canViewAuditAndOutstanding && (activeTab === 'outstanding' || activeTab === 'transactions')) {
      setActiveTab('invoices');
    }
  }, [userRole, activeTab, canViewAuditAndOutstanding]);

  // Compute scorecard metrics dynamically
  const totalCollections = transactions.filter(t => t.status === 'Verified').reduce((sum, t) => sum + t.amount, 0);
  const totalOutstanding = outstandings.reduce((sum, o) => sum + o.pendingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Scorecard cards at top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <CreditCard className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Collections (This Month)</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">₹{totalCollections.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Outstanding Dues</span>
            <h3 className="text-xl font-bold text-rose-600 font-display mt-0.5">₹{totalOutstanding.toLocaleString('en-IN')}</h3>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-slate-100 text-slate-600 rounded-xl border border-slate-200/50">
            <FileText className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Invoices Mapped</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">{invoices.length} Generated</h3>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 pt-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display">Invoices & Collection Ledger</h1>
          <p className="text-xs text-slate-500 font-semibold">Track invoice payment verifications, audit receipts, and broadcast outstanding credit balances reminders.</p>
        </div>
        {activeTab === 'invoices' && (
          <button 
            onClick={() => setIsGenerateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Generate GST Invoice</span>
          </button>
        )}
        {activeTab === 'retailer-settlements' && canViewAuditAndOutstanding && (
          <button 
            onClick={() => setIsRetailerPayOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Record Retailer Payment</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'invoices' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          GST Invoices ({invoices.length})
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'payments' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Payments Matching
        </button>
        {canViewAuditAndOutstanding && (
          <>
            <button 
              onClick={() => setActiveTab('outstanding')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'outstanding' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Outstanding Accounts ({outstandings.length})
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Audit Ledger History
            </button>
            <button 
              onClick={() => setActiveTab('retailer-settlements')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'retailer-settlements' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Retailer Settlements ({retailerPayments.length})
            </button>
          </>
        )}
      </div>

      {/* Contents */}
      {activeTab === 'invoices' ? (
        <DataTable 
          columns={invoiceColumns} 
          data={invoices} 
          searchKeys={["id", "orderId", "shopName"]}
          searchPlaceholder="Search invoices..."
        />
      ) : activeTab === 'payments' ? (
        <DataTable 
          columns={paymentColumns} 
          data={transactions} 
          searchKeys={["id", "utr", "order"]}
          searchPlaceholder="Search transaction matching queue..."
        />
      ) : activeTab === 'outstanding' ? (
        <DataTable 
          columns={outstandingColumns} 
          data={outstandings} 
          searchKeys={["shopName", "city"]}
          searchPlaceholder="Search outstanding shop balances..."
        />
      ) : activeTab === 'retailer-settlements' ? (
        <DataTable 
          columns={retailerPaymentColumns} 
          data={retailerPayments} 
          searchKeys={["shopName", "reference"]}
          searchPlaceholder="Search retailer settlements..."
        />
      ) : (
        <DataTable 
          columns={paymentColumns} 
          data={transactions} 
          searchKeys={["id", "utr", "order"]}
          searchPlaceholder="Search transaction logs..."
        />
      )}

      {/* Generate Invoice Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate GST Invoice"
        onConfirm={handleGenerateInvoiceSubmit}
      >
        <form className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Billing Type</label>
            <select 
              value={billingType} 
              onChange={(e) => setBillingType(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none"
            >
              <option value="Wholesale">Wholesale Billing (Standard Retailer Account)</option>
              <option value="Retailer">Retailer Billing (End Consumer Details)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Order ID</label>
            <select 
              value={selectedOrderId} 
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none"
            >
              {ordersList.map(o => (
                <option key={o._id} value={o.id}>{o.id} — {o.retailerName} (₹{o.amount.toLocaleString('en-IN')})</option>
              ))}
            </select>
          </div>

          {billingType === 'Retailer' && (
            <div className="border border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3">
              <span className="block text-xs font-bold text-slate-700 uppercase">Captured Consumer Information</span>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Customer Full Name *</label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  placeholder="e.g. Ramesh Patel" 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Mobile Number *</label>
                <input 
                  type="text" 
                  value={customerMobile} 
                  onChange={(e) => setCustomerMobile(e.target.value)} 
                  placeholder="10-digit mobile number" 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Email ID (Optional)</label>
                <input 
                  type="email" 
                  value={customerEmail} 
                  onChange={(e) => setCustomerEmail(e.target.value)} 
                  placeholder="customer@email.com" 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">City Location *</label>
                <input 
                  type="text" 
                  value={customerCity} 
                  onChange={(e) => setCustomerCity(e.target.value)} 
                  placeholder="e.g. Pune" 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none bg-white"
                />
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Verify Payment Modal */}
      <Modal
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title="Verify Payment UTR Receipt"
        onConfirm={() => handleVerifyPayment(true)}
        confirmLabel="Verify & Settle"
        cancelLabel="Reject Payment"
        onCancel={() => handleVerifyPayment(false)}
      >
        <div className="space-y-4 text-left">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5 text-xs text-blue-800">
            <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Ensure the bank account has received a credit transaction corresponding to UTR No: <b>{verifyingRecord?.utr}</b> before verifying.</p>
          </div>
          <div className="border border-slate-100 rounded-lg p-3 space-y-2 text-xs text-slate-600 font-semibold">
            <div className="flex justify-between">
              <span>Deposited Outlet:</span>
              <span className="text-slate-800 font-bold">{verifyingRecord?.shopName}</span>
            </div>
            <div className="flex justify-between">
              <span>Order Reference:</span>
              <span className="text-slate-800 font-bold font-mono">{verifyingRecord?.order}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 mt-2">
              <span>Payment Amount:</span>
              <span className="text-slate-900 font-extrabold text-brand-orange">₹{verifyingRecord?.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRetailerPayOpen}
        onClose={() => setIsRetailerPayOpen(false)}
        title="Record Retailer Payment"
        onConfirm={handleRecordRetailerPayment}
        confirmLabel="Save Payment"
      >
        <div className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retailer</label>
            <select
              value={retailerPayForm.retailer_id}
              onChange={(e) => setRetailerPayForm({ ...retailerPayForm, retailer_id: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            >
              <option value="">Select retailer</option>
              {retailersList.map((r) => (
                <option key={r._id} value={r._id}>{r.business_name} — {r.owner_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
            <input type="number" value={retailerPayForm.amount} onChange={(e) => setRetailerPayForm({ ...retailerPayForm, amount: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Date</label>
            <input type="date" value={retailerPayForm.payment_date} onChange={(e) => setRetailerPayForm({ ...retailerPayForm, payment_date: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference / UTR</label>
            <input type="text" value={retailerPayForm.reference} onChange={(e) => setRetailerPayForm({ ...retailerPayForm, reference: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg p-2.5" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
            <textarea value={retailerPayForm.notes} onChange={(e) => setRetailerPayForm({ ...retailerPayForm, notes: e.target.value })} className="w-full text-sm border border-slate-200 rounded-lg p-2.5" rows={2} />
          </div>
          <p className="text-[11px] text-slate-500">Unpaid invoices will be marked paid automatically (oldest first) when payment amount covers them.</p>
        </div>
      </Modal>

    </div>
  );
}
