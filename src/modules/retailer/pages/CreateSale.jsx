import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScanLine, Search, Plus, Trash2, Save, RefreshCw, Package,
  Percent, ShoppingBag, History, Minus, CheckCircle2, Eye,
  Download, Printer, User, Phone, CreditCard, Receipt, Check,
  Share2, MessageSquare, Copy, Mail, MapPin
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRetailerAuth } from '../context/RetailerAuthContext';
import CustomModal from '../components/CustomModal';
import ProductImage from '../../../components/ProductImage';
import { generateRetailInvoicePdf, printRetailInvoice, getWhatsAppShareText, shareRetailInvoiceWhatsApp } from '../../../utils/generateRetailInvoicePdf';

const COLOR_NAME_MAP = {
  '#EF4444': 'Red',
  '#1F2937': 'Black',
  '#3B82F6': 'Blue',
  '#10B981': 'Green',
  '#9CA3AF': 'Grey',
  '#1E3A8A': 'Navy',
  '#F59E0B': 'Yellow',
  '#8B4513': 'Brown',
  '#FFFFFF': 'White'
};

const getColorName = (color) => {
  if (!color) return '';
  return COLOR_NAME_MAP[String(color).toUpperCase()] || color;
};

const sortSizes = (a, b) => {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};

const formatINR = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function CreateSale({ showToast }) {
  const { user } = useRetailerAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [discountMode, setDiscountMode] = useState('none');
  const [billDiscountPercent, setBillDiscountPercent] = useState('');
  const [note, setNote] = useState('');
  const [view, setView] = useState('create');
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanTab, setScanTab] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef({ code: '', at: 0 });
  const [lastSavedSale, setLastSavedSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);

  // Customer & Bill Details Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    mobile: '',
    customer_id: '',
    city: '',
    email: '',
    payment_mode: 'Cash',
    tendered: '',
    counter: 'Counter 4',
    cashier: '100125'
  });
  const [existingCustomerNotice, setExistingCustomerNotice] = useState(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);
  const [invoiceSuccessModal, setInvoiceSuccessModal] = useState(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  const loadStock = () => {
    setLoading(true);
    fetch('/api/retailer/stock')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setStock(res.data.filter((s) => (s.available_qty || 0) > 0));
        } else {
          setStock([]);
        }
      })
      .catch(() => {
        showToast?.('Failed to load inventory stock.', 'error');
        setStock([]);
      })
      .finally(() => setLoading(false));
  };

  const loadHistory = () => {
    setHistoryLoading(true);
    fetch('/api/retailer/sales?limit=50')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setSalesHistory(res.data);
        else setSalesHistory([]);
      })
      .catch(() => setSalesHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (!user?.id) return;
    loadStock();
  }, [user?.id]);

  useEffect(() => {
    if (view === 'history') loadHistory();
  }, [view]);

  const products = useMemo(() => {
    const map = {};
    stock.forEach((row) => {
      const pid = String(row.product_id);
      if (!map[pid]) {
        map[pid] = {
          id: pid,
          name: row.product_name,
          category: row.category,
          image: row.image,
          variants: []
        };
      }
      map[pid].variants.push({
        id: String(row.product_variant_id),
        size: row.size,
        color: row.color,
        sku: row.sku_variant,
        price: Number(row.selling_price) || Number(row.mrp) || 0,
        mrp: Number(row.mrp) || 0,
        stock: Number(row.available_qty) || 0
      });
    });
    return Object.values(map);
  }, [stock]);

  // Default size/color when products load
  useEffect(() => {
    setSelectedOptions((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        if (next[p.id]) return;
        const preferred = p.variants.find((v) => v.stock > 0) || p.variants[0];
        if (preferred) {
          next[p.id] = { size: preferred.size, color: preferred.color };
        }
      });
      return next;
    });
  }, [products]);

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      p.variants.some((v) => (v.sku || '').toLowerCase().includes(q))
    );
  });

  const handleSizeChange = (product, size) => {
    setSelectedOptions((prev) => {
      const current = prev[product.id] || {};
      const variantsForSize = product.variants.filter((v) => v.size === size);
      const keepColor = variantsForSize.find((v) => v.color === current.color && v.stock > 0);
      const fallback = variantsForSize.find((v) => v.stock > 0) || variantsForSize[0];
      return {
        ...prev,
        [product.id]: { size, color: keepColor ? current.color : fallback?.color }
      };
    });
  };

  const handleColorChange = (product, color) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [product.id]: { ...(prev[product.id] || {}), color }
    }));
  };

  const getActiveVariant = (product) => {
    const option = selectedOptions[product.id] || {};
    return (
      product.variants.find((v) => v.size === option.size && v.color === option.color) ||
      product.variants.find((v) => v.size === option.size && v.stock > 0) ||
      product.variants.find((v) => v.stock > 0) ||
      product.variants[0]
    );
  };

  const findVariantByBarcode = (code) => {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return null;
    for (const product of products) {
      const variant = product.variants.find((v) => (v.sku || '').toUpperCase() === norm);
      if (variant) return { product, variant };
    }
    return null;
  };

  const addToCart = (product, variant, qty = 1) => {
    if (!variant || variant.stock <= 0) {
      showToast?.('This size/color is out of stock in your inventory.', 'error');
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.variant.id === variant.id);
      if (idx > -1) {
        const nextQty = prev[idx].quantity + qty;
        if (nextQty > variant.stock) {
          showToast?.(`Only ${variant.stock} pairs available.`, 'error');
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: nextQty };
        return next;
      }
      return [...prev, { product, variant, quantity: Math.min(qty, variant.stock), discount_percent: '' }];
    });
    showToast?.(`Added ${product.name} (S-${variant.size} · ${getColorName(variant.color)})`, 'success');
  };

  const handleBarcodeScan = (code, { closeAfter = false } = {}) => {
    const match = findVariantByBarcode(code);
    if (!match) {
      showToast?.(`No inventory item found for barcode "${code}".`, 'error');
      return;
    }
    setSelectedOptions((prev) => ({
      ...prev,
      [match.product.id]: { size: match.variant.size, color: match.variant.color }
    }));
    addToCart(match.product, match.variant);
    if (closeAfter) setIsScanOpen(false);
  };

  useEffect(() => {
    if (!isScanOpen || scanTab !== 'camera') return undefined;
    let scanner = null;
    const onScanSuccess = (decodedText) => {
      const now = Date.now();
      if (lastScanRef.current.code === decodedText && now - lastScanRef.current.at < 2000) return;
      lastScanRef.current = { code: decodedText, at: now };
      handleBarcodeScan(decodedText);
    };
    scanner = new Html5QrcodeScanner('retailer-sale-scan-reader', { fps: 10, qrbox: 250 }, false);
    scanner.render(onScanSuccess, () => {});
    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanOpen, scanTab, products]);

  const updateQty = (variantId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant.id !== variantId) return item;
          const next = item.quantity + delta;
          if (next > item.variant.stock) {
            showToast?.(`Only ${item.variant.stock} pairs available.`, 'error');
            return item;
          }
          return { ...item, quantity: next };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const setLineDiscount = (variantId, percent) => {
    const v = percent === '' ? '' : Math.min(100, Math.max(0, Number(percent)));
    setCart((prev) => prev.map((i) => (i.variant.id === variantId ? { ...i, discount_percent: v } : i)));
  };

  const cartTotals = useMemo(() => {
    let gross = 0;
    let lineDiscount = 0;
    cart.forEach((item) => {
      const line = item.variant.price * item.quantity;
      gross += line;
      if (discountMode === 'line') {
        lineDiscount += line * ((Number(item.discount_percent) || 0) / 100);
      }
    });
    gross = Math.round(gross * 100) / 100;
    lineDiscount = Math.round(lineDiscount * 100) / 100;
    const afterLine = Math.round((gross - lineDiscount) * 100) / 100;
    const billDisc =
      discountMode === 'bill'
        ? Math.round(((afterLine * (Number(billDiscountPercent) || 0)) / 100) * 100) / 100
        : 0;
    const discount = discountMode === 'bill' ? billDisc : lineDiscount;
    const grand = Math.round((afterLine - billDisc) * 100) / 100;
    // Dynamic GST reverse deduction (prices are inclusive of GST)
    const gstRate = 12; // Standard footwear category GST %
    const taxableBase = Math.round((grand / (1 + gstRate / 100)) * 100) / 100;
    const gstAmount = Math.round((grand - taxableBase) * 100) / 100;

    return {
      pairs: cart.reduce((s, i) => s + i.quantity, 0),
      subtotal: gross,
      discount,
      grand,
      taxableBase,
      gstRate,
      gstAmount
    };
  }, [cart, discountMode, billDiscountPercent]);

  const handleOpenCustomerModal = () => {
    if (cart.length === 0) {
      showToast?.('Add at least one product before saving.', 'error');
      return;
    }
    const storeCity = user?.city?.name || user?.city || 'Surat';
    setExistingCustomerNotice(null);
    setCustomerForm({
      name: '',
      mobile: '',
      customer_id: '',
      city: storeCity,
      email: '',
      payment_mode: 'Cash',
      tendered: cartTotals.grand.toString(),
      counter: 'Counter 4',
      cashier: user?.name || user?.business_name || '100125'
    });
    setIsCustomerModalOpen(true);
  };

  const handleMobileLookup = async (mobileInput) => {
    const clean = mobileInput.replace(/\D/g, '');
    const autoId = clean.length >= 4 ? `CUST-${clean.slice(-4)}` : '';
    setCustomerForm((f) => ({
      ...f,
      mobile: clean,
      customer_id: f.customer_id && !f.customer_id.startsWith('CUST-') ? f.customer_id : autoId
    }));

    if (clean.length === 10) {
      setIsLookingUpCustomer(true);
      try {
        const res = await fetch(`/api/retailer/customers/lookup?mobile=${clean}`);
        const resData = await res.json();
        if (resData.success && resData.data) {
          const c = resData.data;
          setCustomerForm((f) => ({
            ...f,
            name: c.customer_name || f.name,
            email: c.email && c.email !== '—' && c.email !== 'N/A' ? c.email : f.email,
            city: c.city || f.city,
            customer_id: c.id || autoId
          }));
          setExistingCustomerNotice({
            name: c.customer_name,
            orders: c.totalOrders || 1,
            spend: c.totalSpend || 0,
            city: c.city
          });
          showToast?.(`Existing customer found: ${c.customer_name}`, 'info');
        } else {
          setExistingCustomerNotice(null);
        }
      } catch {
        setExistingCustomerNotice(null);
      } finally {
        setIsLookingUpCustomer(false);
      }
    } else {
      setExistingCustomerNotice(null);
    }
  };

  const handleConfirmSale = async (e) => {
    if (e) e.preventDefault();
    if (!customerForm.name.trim()) {
      showToast?.('Customer Name is required.', 'error');
      return;
    }
    if (!customerForm.mobile.trim() || customerForm.mobile.trim().length < 10) {
      showToast?.('Valid 10-digit Customer Mobile Number is required.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const tenderedAmt = Number(customerForm.tendered) || cartTotals.grand;
      const changeDueAmt = tenderedAmt > cartTotals.grand ? Math.round((tenderedAmt - cartTotals.grand) * 100) / 100 : 0;
      const custIdFinal = customerForm.customer_id?.trim() || `CUST-${customerForm.mobile.trim().slice(-4)}`;

      const payload = {
        discount_mode: discountMode,
        bill_discount_percent: discountMode === 'bill' ? Number(billDiscountPercent) || 0 : 0,
        note,
        customer_name: customerForm.name.trim(),
        customer_mobile: customerForm.mobile.trim(),
        customer_id: custIdFinal,
        customer_email: customerForm.email?.trim() || '',
        customer_city: customerForm.city?.trim() || '',
        payment_mode: customerForm.payment_mode,
        tendered_amount: tenderedAmt,
        change_due: changeDueAmt,
        counter_number: customerForm.counter || 'Counter 4',
        cashier_name: customerForm.cashier || user?.name || user?.business_name || '100125',
        items: cart.map((item) => ({
          product_variant: item.variant.id,
          quantity: item.quantity,
          discount_percent: discountMode === 'line' ? item.discount_percent || 0 : 0
        }))
      };
      const res = await fetch('/api/retailer/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save sale.');
      }
      const savedSale = data.data;
      setLastSavedSale(savedSale);
      setInvoiceSuccessModal(savedSale);
      setIsCustomerModalOpen(false);
      setCart([]);
      setBillDiscountPercent('');
      setDiscountMode('none');
      setNote('');
      showToast?.(`Sale ${savedSale.sale_number} recorded for ${savedSale.customer_name}.`, 'success');
      loadStock();
    } catch (err) {
      showToast?.(err.message || 'Failed to save sale.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse min-h-[400px] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-slate-400 text-xs font-bold">
          <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
          Loading your sellable inventory...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Create Sale</h1>
          <p className="text-xs text-slate-550 font-medium">
            Pick a product, choose size (and color), then add to the bill — or scan a barcode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('create')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              view === 'create'
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-orange/40'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 inline mr-1.5" />
            New Sale
          </button>
          <button
            type="button"
            onClick={() => setView('history')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
              view === 'history'
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-orange/40'
            }`}
          >
            <History className="w-3.5 h-3.5 inline mr-1.5" />
            Sale History
          </button>
        </div>
      </div>

      {view === 'history' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {historyLoading ? (
            <div className="p-10 text-center text-xs text-slate-400 font-semibold">
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-brand-orange" />
              Loading sales...
            </div>
          ) : salesHistory.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-semibold">No sales recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Sale #</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3 text-right">Pairs</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Tax Invoice</th>
                    <th className="px-4 py-3 text-center">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesHistory.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{sale.sale_number}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{sale.customer_name || 'Walk-in Customer'}</span>
                        {sale.customer_mobile && (
                          <span className="text-[10px] text-slate-400 font-mono block">{sale.customer_mobile}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{sale.pairs_sold || 0}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-brand-orange">{formatINR(sale.grand_total)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => generateRetailInvoicePdf(sale, user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-50 text-brand-orange border border-orange-200 text-[10px] font-bold hover:bg-orange-100 transition-colors shadow-2xs"
                            title="Download PDF Tax Invoice (Westside style)"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => printRetailInvoice(sale, user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-bold hover:bg-slate-100 transition-colors"
                            title="Print Invoice Slip"
                          >
                            <Printer className="w-3 h-3" /> Print
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingSale(sale)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-brand-orange hover:border-brand-orange/40 hover:bg-orange-50 transition-colors"
                          title="View sale details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products by name, category, or SKU..."
                  className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsScanOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                <ScanLine className="w-4 h-4" />
                Scan Barcode
              </button>
              <button
                type="button"
                onClick={loadStock}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-brand-orange/40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-semibold text-slate-550">
                  No available inventory. Purchase stock via Place Order first, then sell from here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredProducts.map((product) => {
                  const option = selectedOptions[product.id] || {};
                  const sizes = [...new Set(product.variants.map((v) => v.size))].sort(sortSizes);
                  const colorsForSize = [
                    ...new Set(
                      product.variants
                        .filter((v) => v.size === option.size)
                        .map((v) => v.color)
                    )
                  ];
                  const activeVariant = getActiveVariant(product);
                  const totalAvailable = product.variants.reduce((s, v) => s + (v.stock || 0), 0);

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                    >
                      <div className="relative h-40 bg-slate-100">
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full"
                          rounded="rounded-none"
                          imgClassName="w-full h-full object-cover"
                          iconClassName="w-10 h-10 text-slate-300"
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {product.category}
                        </span>
                        <span className="absolute top-2 right-2 bg-white/90 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full">
                          {totalAvailable} pairs
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 font-display line-clamp-1">{product.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            From {formatINR(Math.min(...product.variants.map((v) => v.price || 0)))}
                          </p>
                        </div>

                        <div className="space-y-1.5 border-t border-slate-100 pt-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Select Size</label>
                          <div className="flex flex-wrap gap-1.5">
                            {sizes.map((sz) => {
                              const sizeStock = product.variants
                                .filter((v) => v.size === sz)
                                .reduce((sum, v) => sum + v.stock, 0);
                              const isActive = option.size === sz;
                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => handleSizeChange(product, sz)}
                                  disabled={sizeStock === 0}
                                  className={`min-w-[2rem] px-2 py-1 text-[10px] font-bold border rounded-md transition-colors ${
                                    isActive
                                      ? 'border-brand-orange bg-orange-50 text-brand-orange'
                                      : 'border-slate-200 text-slate-600 hover:border-slate-350'
                                  } ${sizeStock === 0 ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                                >
                                  {sz}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Select Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {colorsForSize.length === 0 ? (
                              <span className="text-[10px] font-semibold text-slate-400">Select a size first</span>
                            ) : (
                              colorsForSize.map((col) => {
                                const colorStock =
                                  product.variants.find((v) => v.size === option.size && v.color === col)?.stock || 0;
                                const isActive = option.color === col;
                                return (
                                  <button
                                    key={col}
                                    type="button"
                                    onClick={() => handleColorChange(product, col)}
                                    disabled={colorStock === 0}
                                    className={`px-2 py-1 text-[10px] font-bold border rounded-md transition-colors ${
                                      isActive
                                        ? 'border-brand-orange bg-orange-50 text-brand-orange'
                                        : 'border-slate-200 text-slate-600 bg-slate-50'
                                    } ${colorStock === 0 ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                                  >
                                    {getColorName(col)}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[9px] text-slate-400 font-bold uppercase block">Selling price</span>
                            <p className="text-sm font-extrabold text-slate-850 font-display">
                              {formatINR(activeVariant?.price || 0)}
                            </p>
                            <span
                              className={`text-[9px] font-bold ${
                                !activeVariant || activeVariant.stock === 0
                                  ? 'text-rose-500'
                                  : activeVariant.stock <= 5
                                    ? 'text-amber-500'
                                    : 'text-slate-400'
                              }`}
                            >
                              {!activeVariant || activeVariant.stock === 0
                                ? 'Out of stock'
                                : `${activeVariant.stock} available`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => addToCart(product, activeVariant)}
                            disabled={!activeVariant || activeVariant.stock <= 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-orange text-white text-[10px] font-bold hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Bill
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bill panel */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs sticky top-4 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 font-display">Current Bill</h2>
                <span className="text-[10px] font-bold text-slate-500 uppercase">{cartTotals.pairs} pairs</span>
              </div>

              <div className="p-4 space-y-3 max-h-[360px] overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-450 text-center py-8 font-medium">
                    Select a product and size to build the bill.
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.variant.id} className="border border-slate-100 rounded-lg p-3 space-y-2">
                      <div className="flex items-start gap-2.5">
                        <ProductImage
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-12 h-12 shrink-0"
                          rounded="rounded-md"
                          iconClassName="w-5 h-5 text-slate-300"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{item.product.name}</p>
                              <p className="text-[10px] text-slate-500">
                                S-{item.variant.size} · {getColorName(item.variant.color)} · {formatINR(item.variant.price)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCart((prev) => prev.filter((i) => i.variant.id !== item.variant.id))}
                              className="text-slate-300 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-slate-200 rounded-md overflow-hidden">
                          <button type="button" onClick={() => updateQty(item.variant.id, -1)} className="px-2 py-1 hover:bg-slate-50">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-3 py-1 text-xs font-bold border-x border-slate-200">{item.quantity}</span>
                          <button type="button" onClick={() => updateQty(item.variant.id, 1)} className="px-2 py-1 hover:bg-slate-50">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-extrabold text-slate-800">
                          {formatINR(
                            item.variant.price *
                              item.quantity *
                              (discountMode === 'line' ? 1 - ((Number(item.discount_percent) || 0) / 100) : 1)
                          )}
                        </span>
                      </div>
                      {discountMode === 'line' && (
                        <div className="flex items-center gap-2">
                          <Percent className="w-3 h-3 text-slate-400" />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            value={item.discount_percent ?? ''}
                            onChange={(e) => setLineDiscount(item.variant.id, e.target.value)}
                            className="w-20 px-2 py-1 text-[11px] border border-slate-200 rounded-md"
                          />
                          <span className="text-[10px] text-slate-500 font-semibold">% off this line</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-4 space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Discount</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'none', label: 'None' },
                      { id: 'line', label: 'Per product' },
                      { id: 'bill', label: 'Whole bill' }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDiscountMode(opt.id)}
                        className={`px-2 py-1.5 rounded-md text-[10px] font-bold border ${
                          discountMode === opt.id
                            ? 'bg-orange-50 text-brand-orange border-brand-orange/40'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {discountMode === 'bill' && (
                  <div className="flex items-center gap-2">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={billDiscountPercent}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setBillDiscountPercent('');
                        } else {
                          const num = Number(val);
                          if (!isNaN(num)) {
                            setBillDiscountPercent(Math.min(100, Math.max(0, num)));
                          }
                        }
                      }}
                      className="w-24 px-2 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                    <span className="text-[10px] text-slate-500 font-semibold">% off entire bill</span>
                  </div>
                )}

                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-bold">{formatINR(cartTotals.subtotal)}</span>
                  </div>
                  {cartTotals.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="font-bold">−{formatINR(cartTotals.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 text-[11px] pt-0.5">
                    <span>Taxable Base (Pre-GST)</span>
                    <span className="font-semibold text-slate-700">{formatINR(cartTotals.taxableBase)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>GST ({cartTotals.gstRate}% Included)</span>
                    <span className="font-semibold text-slate-700">{formatINR(cartTotals.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-100">
                    <span className="font-bold">Grand Total (Incl. GST)</span>
                    <span className="text-base font-extrabold text-brand-orange">{formatINR(cartTotals.grand)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={handleOpenCustomerModal}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Sale & Generate Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lastSavedSale && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-emerald-800">
                Sale {lastSavedSale.sale_number} recorded · {lastSavedSale.pairs_sold} pairs · {formatINR(lastSavedSale.grand_total)}
              </p>
              <p className="text-emerald-700 mt-0.5">
                Customer: {lastSavedSale.customer_name || 'Walk-in'} {lastSavedSale.customer_mobile ? `(${lastSavedSale.customer_mobile})` : ''} · Inventory updated.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateRetailInvoicePdf(lastSavedSale, user)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Bill
            </button>
          </div>
        </div>
      )}

      <CustomModal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={viewingSale ? `Sale details · ${viewingSale.sale_number}` : 'Sale details'}
        size="lg"
        hideFooter
      >
        {viewingSale && (
          <div className="space-y-4 text-xs">
            {/* Customer & Billing Action Banner */}
            <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Customer Details</span>
                <p className="font-extrabold text-slate-800 text-sm">{viewingSale.customer_name || 'Walk-in Customer'}</p>
                <p className="text-[11px] text-slate-500">
                  {viewingSale.customer_mobile ? `📱 ${viewingSale.customer_mobile}` : 'No phone number'} · Mode:{' '}
                  <span className="font-bold text-slate-700">{viewingSale.payment_mode || 'Cash'}</span>
                  {viewingSale.tendered_amount ? ` · Tendered: ${formatINR(viewingSale.tendered_amount)}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shareRetailInvoiceWhatsApp(viewingSale, user, showToast)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-2xs transition-colors"
                  title="Send Invoice Details + PDF on WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => generateRetailInvoicePdf(viewingSale, user)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 shadow-2xs transition-colors"
                  title="Download Huddo Shoes Tax Invoice PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => printRetailInvoice(viewingSale, user)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-2xs transition-colors"
                  title="Print Bill Slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Bill
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3.5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Date</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {viewingSale.createdAt ? new Date(viewingSale.createdAt).toLocaleString('en-IN') : '—'}
                </p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Pairs</span>
                <p className="font-bold text-slate-800 mt-0.5">{viewingSale.pairs_sold || 0}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Discount</span>
                <p className="font-bold text-emerald-600 mt-0.5">{formatINR(viewingSale.discount_amount)}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Grand Total</span>
                <p className="font-extrabold text-brand-orange mt-0.5">{formatINR(viewingSale.grand_total)}</p>
              </div>
            </div>

            {(viewingSale.discount_mode === 'bill' || viewingSale.discount_mode === 'line') && (
              <p className="text-[10px] text-slate-500 font-semibold">
                Discount mode:{' '}
                <span className="text-slate-800 font-bold">
                  {viewingSale.discount_mode === 'bill'
                    ? `Whole bill (${viewingSale.bill_discount_percent || 0}%)`
                    : 'Per product'}
                </span>
              </p>
            )}

            {viewingSale.note ? (
              <p className="text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-500">Note:</span> {viewingSale.note}
              </p>
            ) : null}

            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sold products</h4>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5">Variant</th>
                      <th className="px-4 py-2.5 text-center">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit</th>
                      <th className="px-4 py-2.5 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingSale.items || []).map((item, idx) => {
                      const image = item.product?.image || null;
                      const name = item.product_name || item.product?.name || 'Product';
                      const size = item.size || item.product_variant?.size || '—';
                      const color = item.color || item.product_variant?.color || '';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/40">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ProductImage
                                src={image}
                                alt={name}
                                className="w-11 h-11 shrink-0"
                                rounded="rounded-md"
                                iconClassName="w-5 h-5 text-slate-300"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  {item.sku_variant || item.product_variant?.sku_variant || ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">
                            S-{size}{color ? ` · ${getColorName(color)}` : ''}
                            {item.discount_percent > 0 ? (
                              <span className="block text-[10px] text-emerald-600 font-bold">
                                {item.discount_percent}% off
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right">{formatINR(item.unit_price)}</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-slate-900">
                            {formatINR(item.line_total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CustomModal>

      {/* Customer Details Modal before saving sale */}
      <CustomModal
        isOpen={isCustomerModalOpen}
        onClose={() => !submitting && setIsCustomerModalOpen(false)}
        title="Customer & Tender Details"
        subtitle="Enter customer details to generate the GST Tax Invoice"
        size="md"
        hideFooter
      >
        <form onSubmit={handleConfirmSale} className="space-y-4 text-xs">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-orange-600 block">Total Payable</span>
              <span className="text-xl font-black text-slate-900">{formatINR(cartTotals.grand)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-orange-600 block">Quantity</span>
              <span className="text-xs font-bold text-slate-700">{cartTotals.pairs} Pairs</span>
            </div>
          </div>

          {existingCustomerNotice && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-800">
                <span className="font-extrabold">{existingCustomerNotice.name}</span> is a returning customer!
                <div className="text-emerald-700 text-[10px]">
                  {existingCustomerNotice.orders} past visits &middot; Lifetime spend: {formatINR(existingCustomerNotice.spend)}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">
                  Customer Mobile Number <span className="text-rose-500">*</span>
                </label>
                {isLookingUpCustomer && (
                  <span className="text-[10px] text-brand-orange font-bold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking customer...
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  required
                  type="tel"
                  maxLength={10}
                  value={customerForm.mobile}
                  onChange={(e) => handleMobileLookup(e.target.value)}
                  placeholder="e.g. 7878765065"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    required
                    type="text"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Sanjay Devani"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Customer ID / Loyalty No.
                </label>
                <input
                  type="text"
                  value={customerForm.customer_id}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, customer_id: e.target.value }))}
                  placeholder="e.g. CUST-5065"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  City / Region
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={customerForm.city}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Surat"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Email (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. customer@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Payment Mode</label>
                <select
                  value={customerForm.payment_mode}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, payment_mode: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="NetBanking">Net Banking</option>
                  <option value="Credit">Store Credit / Khata</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tendered Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customerForm.tendered}
                  onChange={(e) => setCustomerForm((f) => ({ ...f, tendered: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold"
                />
              </div>
            </div>

            {Number(customerForm.tendered) > cartTotals.grand && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs">
                <span className="font-bold text-emerald-800">Change Due to Customer:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  {formatINR(Math.round((Number(customerForm.tendered) - cartTotals.grand) * 100) / 100)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !customerForm.name.trim() || !customerForm.mobile.trim() || customerForm.mobile.trim().length < 10}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 shadow-xs"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {submitting ? 'Generating Sale...' : 'Save & Generate Bill'}
            </button>
          </div>
        </form>
      </CustomModal>

      {/* Invoice Success & Download Modal */}
      <CustomModal
        isOpen={Boolean(invoiceSuccessModal)}
        onClose={() => setInvoiceSuccessModal(null)}
        title="Sale Completed & Tax Invoice Ready"
        size="md"
        hideFooter
      >
        {invoiceSuccessModal && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900 font-display">Tax Invoice Ready</h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Invoice #{invoiceSuccessModal.sale_number}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Customer:</span>
                <span className="font-bold text-slate-800">{invoiceSuccessModal.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Mobile:</span>
                <span className="font-mono text-slate-700">{invoiceSuccessModal.customer_mobile || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Quantity:</span>
                <span className="font-bold text-slate-800">{invoiceSuccessModal.pairs_sold || 0} Pairs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Payment Mode:</span>
                <span className="font-bold text-slate-800">{invoiceSuccessModal.payment_mode || 'Cash'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black">
                <span className="text-slate-900">Total Amount:</span>
                <span className="text-brand-orange">{formatINR(invoiceSuccessModal.grand_total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => generateRetailInvoicePdf(invoiceSuccessModal, user)}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 shadow-xs transition-colors cursor-pointer"
                title="Download Huddo Shoes Tax Invoice PDF"
              >
                <Download className="w-4 h-4" />
                Download PDF Bill
              </button>
              <button
                type="button"
                onClick={() => printRetailInvoice(invoiceSuccessModal, user)}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-xs transition-colors cursor-pointer"
                title="Print Huddo Shoes Tax Invoice"
              >
                <Printer className="w-4 h-4" />
                Print Bill
              </button>
            </div>

            {/* WhatsApp Share Option: Both Details and PDF */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => shareRetailInvoiceWhatsApp(invoiceSuccessModal, user, showToast)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Send both Bill Details and attach PDF on WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send on WhatsApp (Details + PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = getWhatsAppShareText(invoiceSuccessModal, user);
                    navigator.clipboard?.writeText(text);
                    setCopiedWhatsApp(true);
                    showToast?.('Invoice summary copied to clipboard!', 'success');
                    setTimeout(() => setCopiedWhatsApp(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 py-2.5 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
                  title="Copy formatted bill text"
                >
                  {copiedWhatsApp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWhatsApp ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Sends formatted bill summary and attaches / downloads "huddo shoes invoice.pdf" for direct WhatsApp dispatch.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInvoiceSuccessModal(null)}
              className="w-full py-2 text-xs text-slate-500 font-bold hover:text-slate-800"
            >
              Close & Continue Selling
            </button>
          </div>
        )}
      </CustomModal>

      <CustomModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        title="Scan Product Barcode"
        size="md"
        hideFooter
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScanTab('manual')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                scanTab === 'manual' ? 'bg-brand-orange text-white border-brand-orange' : 'border-slate-200 text-slate-600'
              }`}
            >
              Manual / Scanner Gun
            </button>
            <button
              type="button"
              onClick={() => setScanTab('camera')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                scanTab === 'camera' ? 'bg-brand-orange text-white border-brand-orange' : 'border-slate-200 text-slate-600'
              }`}
            >
              Camera
            </button>
          </div>

          {scanTab === 'manual' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!manualCode.trim()) return;
                handleBarcodeScan(manualCode, { closeAfter: false });
                setManualCode('');
              }}
              className="space-y-3"
            >
              <input
                autoFocus
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or type SKU / barcode..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              <button type="submit" className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                Add to Bill
              </button>
            </form>
          ) : (
            <div id="retailer-sale-scan-reader" className="rounded-lg overflow-hidden" />
          )}
        </div>
      </CustomModal>
    </div>
  );
}
