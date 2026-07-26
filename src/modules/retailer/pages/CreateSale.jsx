import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScanLine, Search, Plus, Trash2, Save, RefreshCw, Package,
  Percent, ShoppingBag, History, Minus, CheckCircle2
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRetailerAuth } from '../context/RetailerAuthContext';
import CustomModal from '../components/CustomModal';
import ProductImage from '../../../components/ProductImage';

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
  const [billDiscountPercent, setBillDiscountPercent] = useState(0);
  const [note, setNote] = useState('');
  const [view, setView] = useState('create');
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanTab, setScanTab] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef({ code: '', at: 0 });
  const [lastSavedSale, setLastSavedSale] = useState(null);

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
      return [...prev, { product, variant, quantity: Math.min(qty, variant.stock), discount_percent: 0 }];
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
    const v = Math.min(100, Math.max(0, Number(percent) || 0));
    setCart((prev) => prev.map((i) => (i.variant.id === variantId ? { ...i, discount_percent: v } : i)));
  };

  const cartTotals = useMemo(() => {
    let gross = 0;
    let lineDiscount = 0;
    cart.forEach((item) => {
      const line = item.variant.price * item.quantity;
      gross += line;
      if (discountMode === 'line') {
        lineDiscount += line * ((item.discount_percent || 0) / 100);
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
    return {
      pairs: cart.reduce((s, i) => s + i.quantity, 0),
      subtotal: gross,
      discount,
      grand: Math.round((afterLine - billDisc) * 100) / 100
    };
  }, [cart, discountMode, billDiscountPercent]);

  const handleSaveSale = async () => {
    if (cart.length === 0) {
      showToast?.('Add at least one product before saving.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        discount_mode: discountMode,
        bill_discount_percent: discountMode === 'bill' ? Number(billDiscountPercent) || 0 : 0,
        note,
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
      setLastSavedSale(data.data);
      setCart([]);
      setBillDiscountPercent(0);
      setDiscountMode('none');
      setNote('');
      showToast?.(`Sale ${data.data.sale_number} saved. Inventory updated.`, 'success');
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
                    <th className="px-4 py-3 text-right">Pairs</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesHistory.map((sale) => (
                    <tr key={sale._id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-bold text-slate-800">{sale.sale_number}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{sale.pairs_sold || 0}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatINR(sale.discount_amount)}</td>
                      <td className="px-4 py-3 text-right font-extrabold text-brand-orange">{formatINR(sale.grand_total)}</td>
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
                              (discountMode === 'line' ? 1 - (item.discount_percent || 0) / 100 : 1)
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
                            value={item.discount_percent || 0}
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
                      value={billDiscountPercent}
                      onChange={(e) => setBillDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
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
                  <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-100">
                    <span className="font-bold">Grand Total</span>
                    <span className="text-base font-extrabold text-brand-orange">{formatINR(cartTotals.grand)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={submitting || cart.length === 0}
                  onClick={handleSaveSale}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-orange text-white text-xs font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {submitting ? 'Saving...' : 'Save Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lastSavedSale && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-emerald-800">
              Sale {lastSavedSale.sale_number} recorded · {lastSavedSale.pairs_sold} pairs · {formatINR(lastSavedSale.grand_total)}
            </p>
            <p className="text-emerald-700 mt-0.5">Your inventory has been reduced for the sold variants.</p>
          </div>
        </div>
      )}

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
