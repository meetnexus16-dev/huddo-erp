import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Trash2, CreditCard, ChevronRight, CheckCircle2, 
  Upload, Search, Filter, AlertTriangle, AlertCircle, ShoppingCart, RefreshCw, ScanLine
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

import { useRetailerAuth } from '../context/RetailerAuthContext';
import CustomModal from '../components/CustomModal';

export default function PlaceOrder({ showToast, onNavigate }) {
  const { user } = useRetailerAuth();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Selected variant tracking per product (keys: product.id, value: variant.id)
  const [selectedVariants, setSelectedVariants] = useState({});

  // Shopping Cart state: array of items: { product, variant, quantity }
  const [cart, setCart] = useState([]);
  
  // Checkout modal controls
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');

  // Barcode scan-to-bill controls
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [scanTab, setScanTab] = useState('manual'); // manual | camera
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef({ code: '', at: 0 });

  // Fetch product variants from the backend
  useEffect(() => {
    setLoading(true);
    fetch('/api/product-variants?limit=500')
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const productMap = {};
          res.data.forEach(variant => {
            const prod = variant.product;
            if (!prod) return;
            const prodId = prod._id || prod.id || prod;
            const prodName = prod.name || "Unknown Product";
            
            if (!productMap[prodId]) {
              productMap[prodId] = {
                id: prodId,
                name: prodName,
                sku: prod.sku,
                category: prod.category?.name || (typeof prod.category === 'string' ? prod.category : "Footwear"),
                description: prod.description || "",
                image: prod.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
                variants: []
              };
            }
            productMap[prodId].variants.push({
              id: variant._id || variant.id,
              size: variant.size,
              color: variant.color,
              price: variant.selling_price || 0,
              stock: variant.stock_quantity || 0,
              sku: variant.sku_variant
            });
          });

          const productList = Object.values(productMap);
          setProducts(productList);

          // Set default variants
          const initialVariants = {};
          productList.forEach(p => {
            const inStock = p.variants.find(v => v.stock > 0);
            initialVariants[p.id] = inStock ? inStock.id : p.variants[0]?.id;
          });
          setSelectedVariants(initialVariants);
        }
      })
      .catch(err => {
        console.error("Error loading products:", err);
        showToast("Error loading catalog.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Categories extraction
  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleVariantChange = (productId, variantId) => {
    setSelectedVariants(prev => ({
      ...prev,
      [productId]: variantId
    }));
  };

  const handleAddToCart = (product, variant) => {
    if (variant.stock <= 0) {
      showToast("Cannot add out of stock variant.", "error");
      return;
    }

    const existingIndex = cart.findIndex(item => item.variant.id === variant.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= variant.stock) {
        showToast(`Cannot exceed available stock of ${variant.stock} pairs.`, "error");
        return;
      }
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { product, variant, quantity: 1 }]);
    }
    showToast(`Added ${product.name} to cart.`, "success");
  };

  // Resolve a scanned barcode (sku_variant) to a product + variant
  const findVariantByBarcode = (code) => {
    const norm = String(code || '').trim().toUpperCase();
    if (!norm) return null;
    for (const product of products) {
      const variant = product.variants.find((v) => (v.sku || '').toUpperCase() === norm);
      if (variant) return { product, variant };
    }
    return null;
  };

  const handleBarcodeScan = (code, { closeAfter = false } = {}) => {
    const match = findVariantByBarcode(code);
    if (!match) {
      showToast(`No product found for barcode "${code}".`, 'error');
      return;
    }
    handleAddToCart(match.product, match.variant);
    if (closeAfter) setIsScanOpen(false);
  };

  const handleManualScanSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeScan(manualCode);
    setManualCode('');
  };

  // Initialize the camera scanner when the scan modal is on the camera tab
  useEffect(() => {
    if (!isScanOpen || scanTab !== 'camera') return undefined;
    let scanner = null;
    const onScanSuccess = (decodedText) => {
      const now = Date.now();
      // Debounce repeated decodes of the same code within 2s
      if (lastScanRef.current.code === decodedText && now - lastScanRef.current.at < 2000) return;
      lastScanRef.current = { code: decodedText, at: now };
      handleBarcodeScan(decodedText);
    };
    scanner = new Html5QrcodeScanner('retailer-scan-reader', { fps: 10, qrbox: 250 }, false);
    scanner.render(onScanSuccess, () => {});
    return () => {
      if (scanner) scanner.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanOpen, scanTab, products]);

  const updateCartQuantity = (variantId, amount) => {
    const itemIndex = cart.findIndex(item => item.variant.id === variantId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    const newQty = item.quantity + amount;

    if (newQty <= 0) {
      setCart(cart.filter(it => it.variant.id !== variantId));
      showToast("Item removed from cart.", "success");
    } else if (newQty > item.variant.stock) {
      showToast(`Stock limit reached! Only ${item.variant.stock} pairs available.`, "error");
    } else {
      const newCart = [...cart];
      newCart[itemIndex].quantity = newQty;
      setCart(newCart);
    }
  };

  const removeFromCart = (variantId) => {
    setCart(cart.filter(item => item.variant.id !== variantId));
    showToast("Item removed from cart.", "success");
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      showToast("Please enter a valid UTR transaction number.", "error");
      return;
    }
    if (!screenshotPreview) {
      showToast("Please upload payment receipt screenshot.", "error");
      return;
    }

    setSubmitting(true);

    const payload = {
      retailer: user.id,
      items: cart.map(item => ({
        product_variant: item.variant.id,
        quantity: item.quantity,
        unit_price: item.variant.price,
        total_price: item.variant.price * item.quantity
      })),
      subtotal: subtotal,
      tax_amount: 0,
      discount_amount: 0,
      grand_total: subtotal,
      utr_number: utrNumber,
      payment_screenshot: screenshotPreview,
      payment_status: "Pending",
      status: "Submitted"
    };

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(`Order submitted successfully! Pending approval.`, "success");
        setCart([]);
        setIsCheckoutOpen(false);
        setUtrNumber('');
        setOrderNotes('');
        setPaymentScreenshot(null);
        setScreenshotPreview('');
        onNavigate('My Orders');
      } else {
        showToast(data.message || "Failed to place order.", "error");
      }
    })
    .catch(err => {
      console.error(err);
      showToast("Error submitting order.", "error");
    })
    .finally(() => {
      setSubmitting(false);
    });
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4 min-h-[400px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold font-display">
          <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
          <span>Loading footwear catalog...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">Place New Bulk Order</h1>
        <p className="text-xs text-slate-550 font-medium font-sans">Browse catalog variants, add products, review subtotals, and submit transaction confirmation.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Catalog Browser */}
        <div className="xl:col-span-2 space-y-4">
          
          {/* Controls: Search and Filter Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white font-medium text-slate-700"
                />
              </div>
              <button
                type="button"
                onClick={() => { setIsScanOpen(true); setScanTab('manual'); }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-lg transition-colors"
              >
                <ScanLine className="w-4 h-4" />
                <span>Scan to Bill</span>
              </button>
            </div>
            
            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200 text-slate-500 bg-white hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const activeVariantId = selectedVariants[product.id];
                const activeVariant = product.variants.find(v => v.id === activeVariantId) || product.variants[0];

                return (
                  <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="relative h-44 bg-slate-100 overflow-hidden">
                        <img 
                          src={product.image.startsWith('uploads/') ? `/${product.image}` : product.image} 
                          alt={product.name} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                        />
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {product.category}
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 font-display line-clamp-1">{product.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mt-0.5">{product.description}</p>
                        </div>

                        {/* Variants details */}
                        <div className="space-y-1.5 border-t border-slate-100 pt-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Select Color & Size Variant</label>
                          <div className="flex flex-wrap gap-1.5">
                            {product.variants.map(v => (
                              <button
                                key={v.id}
                                onClick={() => handleVariantChange(product.id, v.id)}
                                className={`px-2 py-1 text-[10px] font-bold border rounded-md transition-colors ${
                                  v.id === activeVariantId
                                    ? 'border-brand-orange bg-orange-50/20 text-brand-orange'
                                    : 'border-slate-200 text-slate-600 hover:border-slate-350'
                                } ${v.stock === 0 ? 'opacity-40 line-through' : ''}`}
                              >
                                {v.color} / S-{v.size}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Cart controls */}
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div>
                        <span className="text-xs text-slate-400 font-bold">Dealer Price</span>
                        <p className="text-base font-extrabold text-slate-850 font-display">₹{(activeVariant?.price || 0).toLocaleString('en-IN')}</p>
                      </div>

                      <div className="text-right">
                        <span className={`block text-[9px] font-bold ${
                          !activeVariant || activeVariant.stock === 0 ? 'text-rose-500' :
                          activeVariant.stock <= 5 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {!activeVariant || activeVariant.stock === 0 ? 'Out of Stock' :
                           activeVariant.stock <= 5 ? `Only ${activeVariant.stock} left` : `Stock: ${activeVariant.stock} pairs`}
                        </span>
                        
                        <button
                          onClick={() => handleAddToCart(product, activeVariant)}
                          disabled={!activeVariant || activeVariant.stock === 0}
                          className="mt-1 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Add to Cart</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <AlertCircle className="w-10 h-10 text-slate-350 mx-auto mb-3" />
              <p className="text-slate-500 text-xs font-semibold">No footwear matching catalog filters.</p>
            </div>
          )}

        </div>

        {/* Right Col: Cart Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-brand-orange" />
              <span>Shopping Cart ({cart.length})</span>
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={() => { setCart([]); showToast("Cleared shopping cart.", "success"); }}
                className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex-1 divide-y divide-slate-100 max-h-[360px] overflow-y-auto min-h-[150px]">
            {cart.length > 0 ? (
              cart.map((item, idx) => (
                <div key={idx} className="p-4 flex items-start justify-between gap-3 bg-white">
                  <div className="text-xs">
                    <h4 className="font-extrabold text-slate-800 font-display line-clamp-1">{item.product.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase">{item.variant.color} / Size {item.variant.size}</p>
                    <span className="text-[11px] font-bold text-slate-700 mt-1 block">₹{item.variant.price} × {item.quantity}</span>
                  </div>

                  <div className="flex flex-col items-end gap-2.5">
                    <div className="flex items-center border border-slate-200 rounded bg-slate-50">
                      <button 
                        onClick={() => updateCartQuantity(item.variant.id, -1)}
                        className="w-5.5 h-5.5 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-200 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button 
                        onClick={() => updateCartQuantity(item.variant.id, 1)}
                        className="w-5.5 h-5.5 flex items-center justify-center text-slate-500 font-bold hover:bg-slate-200 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button 
                      onClick={() => removeFromCart(item.variant.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center h-full gap-2">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
                <span>Your cart is empty.<br />Add products from catalog.</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-155 bg-slate-50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-4">
              <span>Order Subtotal</span>
              <span className="text-base text-slate-900 font-display">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Checkout Order</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Checkout Modal Overlay */}
      <CustomModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Submit Payment Reference"
        onConfirm={handleCheckoutSubmit}
        confirmText={submitting ? "Submitting..." : "Submit Order"}
      >
        <form className="space-y-4" onSubmit={handleCheckoutSubmit}>
          
          <div className="bg-orange-50/20 border border-orange-100 rounded-lg p-3 text-xs text-slate-700">
            <span className="font-bold text-brand-orange uppercase block mb-1">Payment Instructions</span>
            <p className="font-semibold text-slate-600">
              Please transfer <span className="font-extrabold text-slate-900 text-sm">₹{subtotal.toLocaleString('en-IN')}</span> to the official company current account, upload the transaction receipt screenshot, and enter the UTR code below.
            </p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">Upload Payment Screenshot *</label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100/50 transition-colors relative cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleScreenshotChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {screenshotPreview ? (
                <div className="space-y-2 text-center w-full">
                  <img src={screenshotPreview} alt="Receipt preview" className="max-h-28 mx-auto rounded object-contain border border-slate-200" />
                  <span className="text-[10px] text-brand-orange font-bold hover:underline block">Change Image</span>
                </div>
              ) : (
                <div className="text-center space-y-1 text-slate-400">
                  <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-700 block">Click to select photo</span>
                  <span className="text-[9px]">PNG, JPG up to 5MB</span>
                </div>
              )}
            </div>
          </div>

          {/* UTR Input */}
          <div>
            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">UTR / Transaction ID *</label>
            <input 
              type="text" 
              placeholder="e.g. UTR102938475"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white font-semibold text-slate-705"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-slate-550 uppercase mb-1">Order Notes (Optional)</label>
            <textarea 
              rows="2.5" 
              placeholder="Delivery instructions, shipping preference..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white font-medium text-slate-705"
            />
          </div>

        </form>
      </CustomModal>

      {/* Scan-to-Bill Modal */}
      <CustomModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        title="Scan Barcode to Add"
        hideFooter
      >
        <div className="space-y-4">
          <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setScanTab('manual')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${scanTab === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Enter / USB Scanner
            </button>
            <button
              type="button"
              onClick={() => setScanTab('camera')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${scanTab === 'camera' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
            >
              Camera
            </button>
          </div>

          {scanTab === 'manual' ? (
            <form onSubmit={handleManualScanSubmit} className="space-y-3">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-[11px] text-orange-800 flex gap-2">
                <ScanLine className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Point a USB/Bluetooth barcode scanner at the field below, or type the barcode printed on the product label, then press Enter. Each scan adds one unit to the cart.</p>
              </div>
              <input
                autoFocus
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or type barcode (e.g. HDO-AC-01-EF4444-SZ8)"
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" /> Add to Cart
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <div id="retailer-scan-reader" className="w-full" />
              </div>
              <p className="text-[11px] text-slate-400 text-center">Allow camera access and hold the product barcode steady in frame.</p>
            </div>
          )}

          {cart.length > 0 && (
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
              <span className="font-bold">{cart.length}</span> item(s) in cart · Subtotal <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </CustomModal>

    </div>
  );
}
