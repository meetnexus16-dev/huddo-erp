import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShoppingBag, Search, Plus, Minus, Trash2, CheckCircle2, 
  RefreshCw, Package, User, Phone, MapPin, CreditCard, 
  Receipt, Share2, Printer, Download, History, Eye, Check,
  ScanLine, Percent, ArrowRight
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import CustomModal from '../components/CustomModal';
import CustomDataTable from '../components/CustomDataTable';
import StatusBadge from '../components/StatusBadge';
import ProductImage from '../../../components/ProductImage';
import { getAccessToken } from '../../../utils/authSession';
import { generateRetailInvoicePdf, printRetailInvoice, shareRetailInvoiceWhatsApp } from '../../../utils/generateRetailInvoicePdf';

const COLOR_NAME_MAP = {
  '#EF4444': 'Red',
  '#1F2937': 'Black',
  '#3B82F6': 'Blue',
  '#10B981': 'Green',
  '#9CA3AF': 'Grey',
  '#1E3A8A': 'Navy',
  '#F59E0B': 'Yellow',
  '#8B4513': 'Brown',
  '#FFFFFF': 'White',
  'Default': 'Standard'
};

const getColorName = (color) => {
  if (!color) return 'Standard';
  return COLOR_NAME_MAP[String(color).toUpperCase()] || COLOR_NAME_MAP[color] || color;
};

const sortSizes = (a, b) => {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};

const formatINR = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function TeamMemberSales({ showToast }) {
  const [activeView, setActiveView] = useState('pos'); // 'pos' | 'history'
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Discount options
  const [discountMode, setDiscountMode] = useState('none'); // 'none' | 'line' | 'bill'
  const [billDiscountPercent, setBillDiscountPercent] = useState('');

  // Barcode Scanning
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanTab, setScanTab] = useState('manual');
  const lastScanRef = useRef({ code: '', at: 0 });

  // Sales History State
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [viewingSale, setViewingSale] = useState(null);

  // Customer Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [citiesList, setCitiesList] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [note, setNote] = useState('');
  const [existingCustomerNotice, setExistingCustomerNotice] = useState(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);

  // Invoice Success Modal
  const [completedSale, setCompletedSale] = useState(null);

  // Fetch Founder Central Inventory Stock dynamically
  const loadStock = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/employee-self/stock', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStock(data.data.filter(s => (s.available_qty || 0) > 0));
      } else {
        setStock([]);
      }
    } catch (err) {
      console.warn('Failed to load central inventory:', err);
      showToast?.('Unable to load central inventory stock.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cities configured by Founder
  const loadCities = async () => {
    try {
      const token = getAccessToken();
      let res = await fetch('/api/employee-self/cities', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        res = await fetch('/api/cities?limit=500', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }
      const data = await res.json();
      const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const names = Array.from(new Set(rows.map(c => (c.name || '').trim()).filter(Boolean))).sort();
      setCitiesList(names);
      if (names.length > 0) {
        setCustomerCity(prev => prev || names[0]);
      }
    } catch (err) {
      console.warn('Failed to load cities:', err);
    }
  };

  // Fetch Sales History dynamically
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/employee-self/sales', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSalesHistory(data.data);
      }
    } catch (err) {
      console.warn('Failed to load sales history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
    loadHistory();
    loadCities();
  }, []);

  // Group variants by Product for clean, interactive display
  const products = useMemo(() => {
    const map = {};
    stock.forEach((row) => {
      const pid = String(row.product_id || row._id);
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
        id: String(row.variant_id || row._id),
        size: String(row.size),
        color: String(row.color || 'Default'),
        sku: row.sku,
        price: Number(row.selling_price) || Number(row.mrp) || 0,
        mrp: Number(row.mrp) || 0,
        stock: Number(row.available_qty) || 0,
        image: row.image
      });
    });
    return Object.values(map);
  }, [stock]);

  // Set default selected size/color for each product
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

  // Filtered Products Search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = searchTerm.toLowerCase();
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.category || '').toLowerCase().includes(term) ||
        p.variants.some((v) => (v.sku || '').toLowerCase().includes(term) || (v.size || '').includes(term))
      );
    });
  }, [products, searchTerm]);

  // Handle Size Selection
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

  // Handle Color Selection
  const handleColorChange = (product, color) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [product.id]: { ...(prev[product.id] || {}), color }
    }));
  };

  // Add Item to Cart
  const handleAddToCart = (product, variant) => {
    if (!variant || variant.stock <= 0) {
      showToast?.('Selected size/color is out of stock in central inventory.', 'error');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.variant_id === variant.id);
      if (existing) {
        if (existing.quantity >= variant.stock) {
          showToast?.(`Only ${variant.stock} pairs available in stock.`, 'warning');
          return prev;
        }
        return prev.map((item) =>
          item.variant_id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          variant_id: variant.id,
          product_variant: variant.id,
          product_name: product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          unit_price: variant.price,
          quantity: 1,
          available_qty: variant.stock,
          discount_percent: 0,
          image: variant.image || product.image
        }
      ];
    });
  };

  const handleUpdateQty = (variantId, delta) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.variant_id === variantId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.available_qty) {
            showToast?.(`Only ${item.available_qty} pairs available in stock.`, 'warning');
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const handleRemoveFromCart = (variantId) => {
    setCart((prev) => prev.filter((c) => c.variant_id !== variantId));
  };

  // Cart Totals Calculation
  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let pairs = 0;
    let lineDiscountTotal = 0;

    cart.forEach((item) => {
      const lineSubtotal = item.unit_price * item.quantity;
      const discountPct = discountMode === 'line' ? (item.discount_percent || 0) : 0;
      const discountAmt = lineSubtotal * (discountPct / 100);
      subtotal += lineSubtotal;
      lineDiscountTotal += discountAmt;
      pairs += item.quantity;
    });

    let billDiscountAmt = 0;
    if (discountMode === 'bill' && billDiscountPercent) {
      billDiscountAmt = (subtotal * Math.min(100, Math.max(0, Number(billDiscountPercent)))) / 100;
    }

    const totalDiscount = discountMode === 'bill' ? billDiscountAmt : lineDiscountTotal;
    const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));

    return { subtotal, totalDiscount, grandTotal, pairs };
  }, [cart, discountMode, billDiscountPercent]);

  // Dynamic Customer Mobile Lookup
  const handleCustomerMobileChange = async (val) => {
    const clean = val.replace(/\D/g, '').slice(0, 10);
    setCustomerMobile(clean);

    if (clean.length === 10) {
      setIsLookingUpCustomer(true);
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/employee-self/customers/lookup?mobile=${clean}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && data.data) {
          const c = data.data;
          setCustomerName(c.customer_name || customerName);
          if (c.city) {
            setCustomerCity(c.city);
            setCitiesList(prev => prev.includes(c.city) ? prev : [...prev, c.city].sort());
          }
          setExistingCustomerNotice({
            name: c.customer_name,
            totalOrders: c.totalOrders || 0,
            totalSpend: c.totalSpend || 0
          });
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

  // Barcode / SKU Quick Scan
  const handleScanCode = (code) => {
    const trimmed = String(code || '').trim().toUpperCase();
    if (!trimmed) return;

    for (const prod of products) {
      const match = prod.variants.find(
        (v) => (v.sku || '').toUpperCase() === trimmed || v.id === trimmed
      );
      if (match) {
        handleAddToCart(prod, match);
        showToast?.(`Added ${prod.name} (${match.size}/${match.color}) to bill.`, 'success');
        setIsScanOpen(false);
        setManualCode('');
        return;
      }
    }
    showToast?.(`No active central inventory variant found for code "${trimmed}".`, 'warning');
  };

  // Submit Direct Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast?.('Please add items to cart before completing sale.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = getAccessToken();
      const tendered = cartTotals.grandTotal;
      const change = 0;

      const payload = {
        items: cart.map((i) => ({
          product_variant: i.variant_id,
          variant_id: i.variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: discountMode === 'line' ? (i.discount_percent || 0) : 0
        })),
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_mobile: customerMobile.trim(),
        customer_city: customerCity.trim(),
        payment_mode: paymentMode,
        tendered_amount: tendered,
        change_due: change,
        note: note.trim()
      };

      const res = await fetch('/api/employee-self/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCompletedSale(data.sale);
        setIsCheckoutOpen(false);
        setCart([]);
        setCustomerName('Walk-in Customer');
        setCustomerMobile('');
        setCustomerCity(citiesList.length > 0 ? citiesList[0] : '');
        setNote('');
        setExistingCustomerNotice(null);
        showToast?.('Sale successfully completed! Stock deducted and incentives credited.', 'success');
        loadStock();
        loadHistory();
      } else {
        showToast?.(data.message || 'Sale could not be processed.', 'error');
      }
    } catch (err) {
      console.error('Error submitting sale:', err);
      showToast?.('Network error processing sale.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // History Table Columns
  const historyColumns = [
    { header: 'Sale Number', accessor: 'sale_number', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: 'Date', accessor: 'createdAt', render: (val) => new Date(val).toLocaleDateString() },
    { header: 'Customer', accessor: 'customer_name', render: (val, row) => (
      <div>
        <span className="font-bold text-slate-800 block">{val}</span>
        {row.customer_mobile && <span className="text-[10px] text-slate-400">{row.customer_mobile}</span>}
      </div>
    )},
    { header: 'Pairs Sold', accessor: 'pairs_sold', render: (val) => <span className="font-bold text-slate-700">{val || 0} pairs</span> },
    { header: 'Grand Total', accessor: 'grand_total', render: (val) => <span className="font-extrabold text-emerald-600">{formatINR(val)}</span> },
    { header: 'Payment', accessor: 'payment_mode', render: (val) => <StatusBadge status={val === 'Cash' ? 'Approved' : 'Active'} /> },
    { header: 'Actions', accessor: '_id', sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button
          onClick={() => setViewingSale(row)}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 cursor-pointer"
          title="View Invoice"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View</span>
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-orange" />
            <span>Direct Sales & POS Counter</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dynamic counter billing connected to Founder's central warehouse. Multi-tier incentives distributed automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setActiveView('pos')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeView === 'pos' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              POS Counter
            </button>
            <button
              onClick={() => setActiveView('history')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeView === 'history' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sales History ({salesHistory.length})</span>
            </button>
          </div>

          <button
            onClick={() => setIsScanOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={() => { loadStock(); loadHistory(); }}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeView === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Grouped Product Catalog */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search footwear by model name, category, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-medium"
                />
              </div>
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                {filteredProducts.length} Models &bull; {stock.reduce((s, i) => s + (i.available_qty || 0), 0)} Pairs In Stock
              </span>
            </div>

            {loading ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                <RefreshCw className="w-6 h-6 text-brand-orange animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Loading Central Inventory...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No footwear models found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Central inventory has 0 units matching your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-1">
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
                  const activeVariant = product.variants.find(
                    (v) => v.size === option.size && v.color === option.color
                  ) || product.variants[0];

                  return (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-brand-orange/50 transition-all flex flex-col justify-between"
                    >
                      <div className="flex gap-3 items-start">
                        <ProductImage
                          src={activeVariant?.image || product.image}
                          alt={product.name}
                          className="w-16 h-16 shrink-0"
                          imgClassName="w-full h-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-800 capitalize truncate">{product.name}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase block mt-0.5">
                            {product.category || 'Footwear'} &bull; SKU: {activeVariant?.sku || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Size Selector Pills */}
                      <div className="mt-3 space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Select Size</label>
                        <div className="flex flex-wrap gap-1.5">
                          {sizes.map((sz) => {
                            const sizeStock = product.variants
                              .filter((v) => v.size === sz)
                              .reduce((acc, v) => acc + v.stock, 0);
                            const isActive = option.size === sz;
                            return (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => handleSizeChange(product, sz)}
                                disabled={sizeStock === 0}
                                className={`min-w-[2rem] px-2 py-1 text-[10px] font-bold border rounded-md transition-colors cursor-pointer ${
                                  isActive
                                    ? 'border-brand-orange bg-orange-50 text-brand-orange'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-350 bg-white'
                                } ${sizeStock === 0 ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                              >
                                {sz}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dynamic Color Selector Pills */}
                      {colorsForSize.length > 1 && (
                        <div className="mt-2 space-y-1">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Select Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {colorsForSize.map((col) => {
                              const colorStock = product.variants.find(
                                (v) => v.size === option.size && v.color === col
                              )?.stock || 0;
                              const isActive = option.color === col;
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => handleColorChange(product, col)}
                                  disabled={colorStock === 0}
                                  className={`px-2 py-0.5 text-[10px] font-bold border rounded-md transition-colors cursor-pointer ${
                                    isActive
                                      ? 'border-brand-orange bg-orange-50 text-brand-orange'
                                      : 'border-slate-200 text-slate-600 bg-slate-50'
                                  } ${colorStock === 0 ? 'opacity-40 line-through cursor-not-allowed' : ''}`}
                                >
                                  {getColorName(col)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Price & Add to Cart button */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 font-display block">
                            {formatINR(activeVariant?.price || 0)}
                          </span>
                          <span
                            className={`text-[9px] font-bold ${
                              !activeVariant || activeVariant.stock === 0
                                ? 'text-rose-500'
                                : activeVariant.stock <= 5
                                ? 'text-amber-500'
                                : 'text-emerald-600'
                            }`}
                          >
                            {!activeVariant || activeVariant.stock === 0
                              ? 'Out of stock'
                              : `${activeVariant.stock} pairs available`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product, activeVariant)}
                          disabled={!activeVariant || activeVariant.stock <= 0}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Bill</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Col: POS Billing Cart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-400" />
                  <span>Current Bill</span>
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {cartTotals.pairs} Pairs
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <ShoppingBag className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-bold">Bill is currently empty</p>
                  <p className="text-[10px] mt-0.5">Select footwear sizes from catalog to build order.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.variant_id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 truncate block">{item.product_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Size: {item.size} &bull; {item.color} &bull; {formatINR(item.unit_price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateQty(item.variant_id, -1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.variant_id, 1)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveFromCart(item.variant_id)}
                          className="w-6 h-6 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Total & Checkout Trigger */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatINR(cartTotals.subtotal)}</span>
                </div>
                {cartTotals.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatINR(cartTotals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-100">
                  <span>Payable Amount:</span>
                  <span className="text-brand-orange">{formatINR(cartTotals.grandTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(true)}
                disabled={cart.length === 0}
                className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Proceed to Customer Bill</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History View */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <CustomDataTable
            columns={historyColumns}
            data={salesHistory}
            loading={historyLoading}
            searchPlaceholder="Search past direct sales..."
            searchKeys={['sale_number', 'customer_name', 'customer_mobile', 'payment_mode']}
          />
        </div>
      )}

      {/* Customer Details Checkout Modal */}
      <CustomModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Customer Details & Invoice Settlement"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Mobile Number *</label>
            <div className="relative">
              <input
                type="text"
                value={customerMobile}
                onChange={(e) => handleCustomerMobileChange(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-bold"
              />
              {isLookingUpCustomer && (
                <RefreshCw className="w-3.5 h-3.5 text-brand-orange animate-spin absolute right-3 top-3" />
              )}
            </div>

            {existingCustomerNotice && (
              <div className="mt-1.5 p-2 bg-emerald-50 border border-emerald-200 rounded-md text-[10px] text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Existing customer identified: <strong>{existingCustomerNotice.name}</strong> ({existingCustomerNotice.totalOrders} past orders &bull; {formatINR(existingCustomerNotice.totalSpend)} total spend)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">City / Region *</label>
              <select
                value={customerCity}
                onChange={(e) => setCustomerCity(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange/20 cursor-pointer"
              >
                <option value="">-- Select City --</option>
                {citiesList.map((cityName) => (
                  <option key={cityName} value={cityName}>{cityName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-orange/20 cursor-pointer"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI / QR Payment</option>
              <option value="Card">Card</option>
              <option value="NetBanking">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bill Reference / Remarks</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional sales notes..."
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none font-medium"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Total Payable:</span>
            <span className="text-base font-extrabold text-brand-orange">{formatINR(cartTotals.grandTotal)}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCompleteSale}
              disabled={submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Processing...' : 'Complete & Generate Bill'}</span>
            </button>
          </div>
        </div>
      </CustomModal>

      {/* Barcode / SKU Scan Modal */}
      <CustomModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        title="Scan Barcode / SKU Lookup"
      >
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setScanTab('manual')}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                scanTab === 'manual' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
              }`}
            >
              Type SKU / Barcode
            </button>
            <button
              type="button"
              onClick={() => setScanTab('camera')}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                scanTab === 'camera' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
              }`}
            >
              Live Camera Scanner
            </button>
          </div>

          {scanTab === 'manual' ? (
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Enter SKU or Variant Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleScanCode(manualCode); }}
                  placeholder="e.g. AC-121-DEFAULT-SZ7"
                  className="flex-1 text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 font-mono font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => handleScanCode(manualCode)}
                  className="px-4 py-2 bg-slate-900 hover:bg-brand-orange text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Lookup
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
              <ScanLine className="w-8 h-8 text-brand-orange mx-auto animate-pulse" />
              <p className="text-xs font-bold text-slate-700">Point device camera at footwear box barcode</p>
              <p className="text-[10px] text-slate-400">Position the barcode clearly within your camera viewport.</p>
            </div>
          )}
        </div>
      </CustomModal>

      {/* Sale Success Invoice Modal */}
      {completedSale && (
        <CustomModal
          isOpen={!!completedSale}
          onClose={() => setCompletedSale(null)}
          title="Direct Sale Completed"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">Invoice Issued</h3>
              <p className="text-xs font-extrabold text-brand-orange mt-0.5">{completedSale.sale_number}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Central inventory updated. Management commissions disbursed to City, State & Country Managers.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs flex justify-between font-medium">
              <span>Grand Total:</span>
              <span className="font-extrabold text-slate-900">{formatINR(completedSale.grand_total)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => printRetailInvoice(completedSale)}
                className="flex-1 py-2 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={() => generateRetailInvoicePdf(completedSale)}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              {completedSale.customer_mobile && (
                <button
                  onClick={() => shareRetailInvoiceWhatsApp(completedSale)}
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              )}
            </div>
          </div>
        </CustomModal>
      )}

      {/* Invoice Viewer Modal */}
      {viewingSale && (
        <CustomModal
          isOpen={!!viewingSale}
          onClose={() => setViewingSale(null)}
          title={`Invoice ${viewingSale.sale_number}`}
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">{viewingSale.customer_name}</span>
                <span className="text-slate-400 text-[10px]">{viewingSale.customer_mobile || 'No contact'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">{new Date(viewingSale.createdAt).toLocaleString()}</span>
                <span className="font-extrabold text-emerald-600">{formatINR(viewingSale.grand_total)}</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-xs">
              {viewingSale.items?.map((item, idx) => (
                <div key={idx} className="py-2 flex justify-between">
                  <div>
                    <span className="font-bold text-slate-800">{item.product_name}</span>
                    <span className="text-[10px] text-slate-400 block">Size: {item.size} &bull; {item.color} &bull; Qty: {item.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-700">{formatINR(item.line_total)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => printRetailInvoice(viewingSale)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                onClick={() => generateRetailInvoicePdf(viewingSale)}
                className="flex-1 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
