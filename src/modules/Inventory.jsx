import React, { useState, useEffect } from 'react';
import { Archive, Plus, RefreshCw, AlertTriangle, Layers, PackagePlus, History, Tag, Printer } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useConfirm } from '../context/ConfirmContext';
import BarcodeLabelBatchModal from '../components/BarcodeLabelBatchModal';

const COLOR_NAMES = {
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

const colorLabel = (color) => {
  if (!color) return '';
  return COLOR_NAMES[String(color).toUpperCase()] || COLOR_NAMES[color] || color;
};

// Threshold used to flag a variant as "low stock" in the live stock ledger.
const LOW_STOCK_THRESHOLD = 10;

export default function Inventory({ showToast }) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('stock'); // stock | add | history | labels | alerts | transfer | warehouses | returns
  const [stock, setStock] = useState([]);
  const [whList, setWhList] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [productVariants, setProductVariants] = useState([]);
  const [stockLevels, setStockLevels] = useState([]);

  // Add-inventory + barcode label state
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [addForm, setAddForm] = useState({ category: '', product: '', size: '', quantity: '' });
  const [addingStock, setAddingStock] = useState(false);
  const [inventoryTxns, setInventoryTxns] = useState([]);
  const [labelBatches, setLabelBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState(null);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false);
  const [addVariants, setAddVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Filters for Current Stock Levels and Inventory History
  const [stockFilters, setStockFilters] = useState({ category: '', product: '', size: '' });
  const [historyFilters, setHistoryFilters] = useState({ category: '', product: '', size: '' });

  // Modals state
  const [isAddWhOpen, setIsAddWhOpen] = useState(false);
  const [isRaiseBulkOpen, setIsRaiseBulkOpen] = useState(false);
  const [newWh, setNewWh] = useState({ name: '', location: '', manager: '', capacity: '' });

  // Stock transfer state
  const [transferData, setTransferData] = useState({
    fromWh: '',
    toWh: '',
    product: '',
    qty: '50'
  });

  const [transferHistory, setTransferHistory] = useState([]);

  // Returns workflow state
  const [returnHistory, setReturnHistory] = useState([]);
  const [returnForm, setReturnForm] = useState({
    productId: '',
    qty: '',
    reason: 'Defective Product',
    refNo: '',
    notes: ''
  });

  const mapStock = (s) => ({
    id: s._id,
    name: s.product_variant?.product?.name || s.sku || 'Footwear Model',
    sku: s.product_variant?.sku || s.sku || 'HDO-AC-RD-08',
    stockLevel: s.quantity || s.stockLevel || 0,
    warehouse: s.warehouse?.name || s.warehouse || 'Mumbai Central Whse',
    reorderLevel: s.reorder_level || 50,
    status: (s.quantity || s.stockLevel) <= (s.reorder_level || 50) ? ((s.quantity || s.stockLevel) === 0 ? 'Out of Stock' : 'Low Stock') : 'Normal',
    size: s.product_variant?.size || '8',
    color: s.product_variant?.colour || 'Red',
    category: s.product_variant?.product?.category?.name || 'Sports Shoes'
  });

  const mapWarehouse = (w) => ({
    id: w._id,
    name: w.name,
    location: w.location || 'Mumbai',
    manager: w.manager?.full_name || w.manager?.name || (typeof w.manager === 'string' ? w.manager : 'Rajesh Deshpande'),
    managerId: w.manager?._id || w.manager,
    capacity: w.capacity || '10,000 SKUs'
  });

  const mapTransfer = (t) => ({
    id: t.transfer_number || t._id,
    _id: t._id,
    product: t.product_variant?.sku || t.product || 'Footwear Model',
    fromWh: t.from_warehouse?.name || t.fromWh || 'Mumbai Warehouse',
    toWh: t.to_warehouse?.name || t.toWh || 'Delhi Warehouse',
    qty: t.quantity || t.qty || 50,
    date: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : '2026-06-08',
    status: t.status || 'Completed'
  });

  const loadStockLevels = () => {
    fetch('/api/inventory/stock-levels')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data)) {
          setStockLevels(resData.data);
        }
      })
      .catch((err) => console.error('Error loading stock levels:', err));
  };

  const loadAddVariantsForProduct = (productId) => {
    if (!productId) {
      setAddVariants([]);
      return Promise.resolve();
    }
    setVariantsLoading(true);
    return fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data?.variants)) {
          const variants = resData.data.variants
            .filter((v) => !v.is_deleted)
            .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
          setAddVariants(variants);
        } else {
          setAddVariants([]);
        }
      })
      .catch((err) => {
        console.error('Error loading product variants:', err);
        setAddVariants([]);
      })
      .finally(() => setVariantsLoading(false));
  };

  const loadInventoryData = () => {
    fetch('/api/stock-records')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(mapStock);
          setStock(mapped);
          if (mapped.length > 0) {
            setReturnForm(prev => ({ ...prev, productId: mapped[0].id }));
          }
        }
      })
      .catch(err => console.error("Error loading stocks:", err));

    fetch('/api/warehouses')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(mapWarehouse);
          setWhList(mapped);
          if (mapped.length > 1) {
            setTransferData(prev => ({ ...prev, fromWh: mapped[0].name, toWh: mapped[1].name }));
          }
        }
      })
      .catch(err => console.error("Error loading warehouses:", err));

    fetch('/api/stock-transfers')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setTransferHistory(resData.data.map(mapTransfer));
        }
      })
      .catch(err => console.error("Error loading transfers:", err));

    fetch('/api/employees')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setEmployees(resData.data);
          if (resData.data.length > 0) {
            setNewWh(prev => ({ ...prev, manager: resData.data[0].full_name || resData.data[0].name }));
          }
        }
      })
      .catch(err => console.error("Error loading employees:", err));

    fetch('/api/product-variants?limit=500')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setProductVariants(resData.data);
          if (resData.data.length > 0) {
            setTransferData(prev => ({ ...prev, product: resData.data[0].sku_variant || resData.data[0].sku }));
          }
        }
      })
      .catch(err => console.error("Error loading product variants:", err));

    loadStockLevels();

    fetch('/api/inventory/return-stock')
      .then(res => res.json())
      .then(data => setReturnHistory(data))
      .catch(err => console.error("Error loading return logs", err));

    fetch('/api/product-categories')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) setCategories(resData.data);
      })
      .catch(err => console.error("Error loading categories:", err));

    fetch('/api/products?limit=500')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) setProducts(resData.data);
      })
      .catch(err => console.error("Error loading products:", err));

    fetch('/api/inventory/transactions')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) setInventoryTxns(resData.data);
      })
      .catch(err => console.error("Error loading inventory transactions:", err));

    fetch('/api/inventory/label-batches')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) setLabelBatches(resData.data);
      })
      .catch(err => console.error("Error loading label batches:", err));
  };

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Load sizes for the selected product (stock is tracked per size, not per color)
  useEffect(() => {
    loadAddVariantsForProduct(addForm.product);
  }, [addForm.product]);

  const sizeOptions = React.useMemo(() => {
    const bySize = new Map();
    for (const v of addVariants) {
      const size = String(v.size);
      if (!bySize.has(size)) {
        bySize.set(size, {
          size,
          totalStock: Number(v.stock_quantity) || 0
        });
      }
    }
    return Array.from(bySize.values()).sort((a, b) => {
      const na = parseFloat(a.size);
      const nb = parseFloat(b.size);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.size.localeCompare(b.size);
    });
  }, [addVariants]);

  const selectedSizeEntry = sizeOptions.find((s) => s.size === addForm.size);

  const filteredProducts = addForm.category
    ? products.filter((p) => (p.category?._id || p.category) === addForm.category)
    : products;

  const handleAddInventorySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!addForm.product || !addForm.size) {
      showToast('Please select a product and size.', 'error');
      return;
    }
    const qty = Number(addForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('Enter a valid quantity greater than zero.', 'error');
      return;
    }

    const product = products.find((p) => p._id === addForm.product);
    const confirmed = await confirm({
      title: 'Add inventory?',
      message: `Add ${qty} unit(s) of ${product?.name || 'product'} (UK ${addForm.size}) to stock? Barcode labels will be generated for printing.`,
      confirmText: 'Add & Generate Labels'
    });
    if (!confirmed) return;

    const productId = addForm.product;
    setAddingStock(true);
    try {
      const res = await fetch('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: addForm.product, size: addForm.size, quantity: qty })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to add inventory.', 'error');
        return;
      }
      showToast(data.message || 'Inventory added.', 'success');

      // Open the barcode label batch popup immediately
      if (data.data?.batch) {
        setActiveBatch({
          ...data.data.batch,
          product_name: data.data.batch.product_name || product?.name,
          article_no: data.data.batch.article_no || product?.sku
        });
        setLabelModalOpen(true);
      }

      setAddForm({ ...addForm, size: '', quantity: '' });
      setIsAddInventoryOpen(false);
      loadStockLevels();
      loadInventoryData();
      if (productId) loadAddVariantsForProduct(productId);
    } catch (err) {
      console.error('Add inventory failed:', err);
      showToast('Network error while adding inventory.', 'error');
    } finally {
      setAddingStock(false);
    }
  };

  const openBatchLabels = (batch) => {
    setActiveBatch(batch);
    setLabelModalOpen(true);
  };

  const handleReturnStockSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.productId || !returnForm.qty) {
      showToast("Please fill all required fields.", "error");
      return;
    }
    try {
      const res = await fetch('/api/inventory/return-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: returnForm.productId,
          quantity: Number(returnForm.qty),
          reason: returnForm.reason,
          reference_no: returnForm.refNo,
          notes: returnForm.notes,
          returned_by: "Rohan Hudda"
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Stock return registered. Stock level increased.", "success");
        loadInventoryData();
        // Reset form
        setReturnForm({
          productId: stock[0]?.id || '',
          qty: '',
          reason: 'Defective Product',
          refNo: '',
          notes: ''
        });
      } else {
        showToast(data.error || "Failed to process return", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error processing return", "error");
    }
  };

  const handleAddWarehouseSubmit = (e) => {
    e.preventDefault();
    if (!newWh.name || !newWh.location) {
      showToast("Please enter warehouse name and address location.", "error");
      return;
    }

    const selectedEmp = employees.find(emp => (emp.full_name || emp.name) === newWh.manager) || employees[0];
    const payload = {
      name: newWh.name,
      location: newWh.location,
      manager: selectedEmp?._id,
      capacity: newWh.capacity || '10,000 SKUs'
    };

    fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`Warehouse "${newWh.name}" added to logistics nodes.`, "success");
          setIsAddWhOpen(false);
          setNewWh({ name: '', location: '', manager: employees[0]?.full_name || '', capacity: '' });
          loadInventoryData();
        } else {
          showToast(resData.message || "Failed to create warehouse.", "error");
        }
      })
      .catch(err => console.error(err));
  };

  const handleStockTransferSubmit = (e) => {
    e.preventDefault();
    if (transferData.fromWh === transferData.toWh) {
      showToast("Source and target facilities cannot be the same.", "error");
      return;
    }
    if (!transferData.qty || Number(transferData.qty) <= 0) {
      showToast("Please enter a valid transfer quantity.", "error");
      return;
    }

    const selectedFromWhObj = whList.find(w => w.name === transferData.fromWh) || whList[0];
    const selectedToWhObj = whList.find(w => w.name === transferData.toWh) || whList[1];
    const selectedVariantObj = productVariants.find(pv => pv.sku === transferData.product) || productVariants[0];

    if (!selectedFromWhObj || !selectedToWhObj || !selectedVariantObj) {
      showToast("Please check warehouse and variant details.", "error");
      return;
    }

    const cachedUser = localStorage.getItem('huddo_user');
    const currentUser = cachedUser ? JSON.parse(cachedUser) : null;

    const payload = {
      from_warehouse: selectedFromWhObj.id,
      to_warehouse: selectedToWhObj.id,
      product_variant: selectedVariantObj._id,
      quantity: Number(transferData.qty),
      transferred_by: currentUser?._id
    };

    fetch('/api/stock-transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`Stock transfer request created: Dispatched ${transferData.qty} pairs of ${transferData.product}.`, "success");
          setIsRaiseBulkOpen(false);
          loadInventoryData();
        } else {
          showToast(resData.message || "Transfer failed.", "error");
        }
      })
      .catch(err => console.error(err));
  };

  const openHistoryForStockRow = (row) => {
    setHistoryFilters({
      category: row.categoryId || '',
      product: row.productId || '',
      size: row.size || ''
    });
    setActiveTab('history');
  };

  const sortSizes = (a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b));
  };

  // Live stock ledger — one row per product + size (inventory is not tracked per color)
  const liveStock = stockLevels.map((row) => {
    const prod = row.product && typeof row.product === 'object' ? row.product : null;
    const level = Number(row.stock_quantity) || 0;
    const categoryId = prod?.category?._id || prod?.category || '';
    return {
      id: row._id,
      productId: String(prod?._id || ''),
      categoryId: String(categoryId),
      name: prod?.name || 'Product',
      articleSku: prod?.sku || '—',
      category: prod?.category?.name || 'Uncategorized',
      size: row.size,
      stockLevel: level,
      status: level === 0 ? 'Out of Stock' : level <= LOW_STOCK_THRESHOLD ? 'Low Stock' : 'Normal'
    };
  });

  const stockFilterProducts = stockFilters.category
    ? products.filter((p) => String(p.category?._id || p.category) === stockFilters.category)
    : products;

  const historyFilterProducts = historyFilters.category
    ? products.filter((p) => String(p.category?._id || p.category) === historyFilters.category)
    : products;

  const stockFilterSizeOptions = React.useMemo(() => {
    const sizes = new Set();
    liveStock.forEach((row) => {
      if (stockFilters.category && row.categoryId !== stockFilters.category) return;
      if (stockFilters.product && row.productId !== stockFilters.product) return;
      sizes.add(String(row.size));
    });
    return Array.from(sizes).sort(sortSizes);
  }, [liveStock, stockFilters.category, stockFilters.product]);

  const historyFilterSizeOptions = React.useMemo(() => {
    const sizes = new Set();
    liveStock.forEach((row) => {
      if (historyFilters.category && row.categoryId !== historyFilters.category) return;
      if (historyFilters.product && row.productId !== historyFilters.product) return;
      sizes.add(String(row.size));
    });
    inventoryTxns.forEach((txn) => {
      const prodId = String(txn.product?._id || txn.product || '');
      const prod = products.find((p) => p._id === prodId) || txn.product;
      const categoryId = String(prod?.category?._id || prod?.category || '');
      if (historyFilters.category && categoryId !== historyFilters.category) return;
      if (historyFilters.product && prodId !== historyFilters.product) return;
      if (txn.product_variant?.size) sizes.add(String(txn.product_variant.size));
    });
    return Array.from(sizes).sort(sortSizes);
  }, [liveStock, historyFilters.category, historyFilters.product, inventoryTxns, products]);

  const filteredLiveStock = liveStock.filter((row) => {
    if (stockFilters.category && row.categoryId !== stockFilters.category) return false;
    if (stockFilters.product && row.productId !== stockFilters.product) return false;
    if (stockFilters.size && String(row.size) !== stockFilters.size) return false;
    return true;
  });

  const filteredInventoryTxns = inventoryTxns.filter((txn) => {
    const prodId = String(txn.product?._id || txn.product || '');
    const prod = products.find((p) => p._id === prodId) || (typeof txn.product === 'object' ? txn.product : null);
    const categoryId = String(prod?.category?._id || prod?.category || '');
    if (historyFilters.category && categoryId !== historyFilters.category) return false;
    if (historyFilters.product && prodId !== historyFilters.product) return false;
    if (historyFilters.size && String(txn.product_variant?.size) !== historyFilters.size) return false;
    return true;
  });

  const transferColumns = [
    { header: "Transfer ID", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono text-[11px]">{val}</span> },
    { header: "Product Model", accessor: "product", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "From Facility", accessor: "fromWh" },
    { header: "To Facility", accessor: "toWh" },
    { header: "Quantity (Pairs)", accessor: "qty", cellClassName: "text-right font-bold text-slate-900" },
    { header: "Date Dispatched", accessor: "date" },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        val === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}>
        {val}
      </span>
    )}
  ];

  // Low stock filters (based on filtered live stock)
  const lowStockItems = filteredLiveStock.filter((item) => item.stockLevel <= LOW_STOCK_THRESHOLD);

  const liveStockColumns = [
    { header: "Product", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Article No.", accessor: "articleSku", render: (val) => <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px] text-slate-600 font-bold">{val}</code> },
    { header: "Category", accessor: "category" },
    { header: "Size", accessor: "size", render: (val) => <span className="font-bold text-slate-800">UK {val}</span> },
    { header: "Current Stock", accessor: "stockLevel", render: (val) => <span className={`font-bold ${val === 0 ? 'text-rose-600' : val <= LOW_STOCK_THRESHOLD ? 'text-amber-500' : 'text-slate-800'}`}>{val} pairs</span> },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        val === 'Normal' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        val === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
        'bg-rose-50 text-rose-700 border-rose-200'
      }`}>
        {val}
      </span>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button
        type="button"
        onClick={() => openHistoryForStockRow(row)}
        className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline"
      >
        <History className="w-3.5 h-3.5" /> History
      </button>
    )}
  ];

  const renderInventoryFilters = (filters, setFilters, filterProducts, sizeOptions, onClear) => (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => setFilters({ category: e.target.value, product: '', size: '' })}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Product</label>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ ...filters, product: e.target.value, size: '' })}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
          >
            <option value="">All products</option>
            {filterProducts.map((p) => (
              <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Size</label>
          <select
            value={filters.size}
            onChange={(e) => setFilters({ ...filters, size: e.target.value })}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
          >
            <option value="">All sizes</option>
            {sizeOptions.map((s) => (
              <option key={s} value={s}>UK {s}</option>
            ))}
          </select>
        </div>
        {(filters.category || filters.product || filters.size) && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );

  const whColumns = [
    { header: "Warehouse ID", accessor: "id" },
    { header: "Warehouse Facility Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Address Location", accessor: "location" },
    { header: "Facility Head", accessor: "manager" },
    { header: "Inventory Capacity", accessor: "capacity" }
  ];

  // Stock tracking movement chart mock
  const mockStockMovement = [
    { day: '06-01', in: 1200, out: 950 },
    { day: '06-03', in: 1500, out: 1100 },
    { day: '06-05', in: 800, out: 1300 },
    { day: '06-07', in: 1900, out: 1200 }
  ];

  return (
    <div className="space-y-6">
      {/* Stock metrics dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-200/50">
            <Archive className="w-6 h-6 text-brand-orange" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Stock Lines</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">{liveStock.length} Active</h3>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Low Stock Alerts</span>
            <h3 className="text-xl font-bold text-amber-600 font-display mt-0.5">{lowStockItems.filter(i => i.stockLevel > 0).length} Items</h3>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Out of Stock</span>
            <h3 className="text-xl font-bold text-rose-600 font-display mt-0.5">{liveStock.filter(i => i.stockLevel === 0).length} Lines</h3>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Layers className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Warehouses Mapped</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">{whList.length} Facilities</h3>
          </div>
        </div>
      </div>

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-200 pt-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900 font-display">Inventory Logs & Logistics</h1>
          <p className="text-xs text-slate-500 font-semibold">Perform warehouse balance checks, authorize inbound transfers, and update auto-reordering limits.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setAddForm({
                category: stockFilters.category || '',
                product: stockFilters.product || '',
                size: stockFilters.size || '',
                quantity: ''
              });
              setIsAddInventoryOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>Add Inventory</span>
          </button>
          {activeTab === 'stock' && (
            <button 
              onClick={loadStockLevels}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-dark text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveTab('stock')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'stock' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Current Stock Levels ({liveStock.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'history' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <History className="w-4 h-4" /> Inventory History ({inventoryTxns.length})
        </button>
        <button 
          onClick={() => setActiveTab('labels')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'labels' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Tag className="w-4 h-4" /> Barcode Labels ({labelBatches.length})
        </button>
        <button 
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'alerts' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Low Stock Alerts ({lowStockItems.length})
        </button>
        <button 
          onClick={() => setActiveTab('transfer')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'transfer' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Facility Stock Transfers ({transferHistory.length})
        </button>
        <button 
          onClick={() => setActiveTab('warehouses')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'warehouses' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Logistics Facilities ({whList.length})
        </button>
        <button 
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'returns' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Stock Returns Queue ({returnHistory.length})
        </button>
      </div>

      {/* Control bar */}
      {(activeTab === 'warehouses' || activeTab === 'transfer') && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap gap-2 items-center justify-between">
          <span className="text-xs text-slate-400 font-bold">Options</span>
          {activeTab === 'warehouses' ? (
            <button 
              onClick={() => setIsAddWhOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Facility Node</span>
            </button>
          ) : (
            <button 
              onClick={() => setIsRaiseBulkOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise Transfer Request</span>
            </button>
          )}
        </div>
      )}

      {/* Contents */}
      {activeTab === 'stock' ? (
        <div className="space-y-4">
          {renderInventoryFilters(
            stockFilters,
            setStockFilters,
            stockFilterProducts,
            stockFilterSizeOptions,
            () => setStockFilters({ category: '', product: '', size: '' })
          )}
          <DataTable 
          columns={liveStockColumns} 
          data={filteredLiveStock} 
          searchKeys={["name", "articleSku", "category", "size"]}
          searchPlaceholder="Search current stock by product, article no. or size..."
          emptyStateText="No stock lines match the selected filters."
        />
        </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-4">
          {renderInventoryFilters(
            historyFilters,
            setHistoryFilters,
            historyFilterProducts,
            historyFilterSizeOptions,
            () => setHistoryFilters({ category: '', product: '', size: '' })
          )}
          <DataTable
          columns={[
            { header: 'Date', accessor: 'createdAt', render: (val) => <span className="text-slate-600">{new Date(val).toLocaleString()}</span> },
            { header: 'Product', accessor: 'product', render: (val) => <span className="font-bold text-slate-800">{val?.name || '—'}</span> },
            { header: 'Size', accessor: 'product_variant', render: (val) => <span className="text-slate-600">{val ? `UK ${val.size}` : '—'}</span> },
            { header: 'SKU', accessor: 'product_variant', render: (val) => <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{val?.sku_variant || '—'}</code> },
            { header: 'Type', accessor: 'type', render: (val) => (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                val === 'add' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                val === 'deduct' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>{val === 'add' ? 'Stock In' : val === 'deduct' ? 'Stock Out' : 'Adjust'}</span>
            )},
            { header: 'Quantity', accessor: 'quantity', render: (val, row) => (
              <span className={`font-bold ${row.type === 'add' ? 'text-emerald-600' : row.type === 'deduct' ? 'text-rose-600' : 'text-slate-700'}`}>
                {row.type === 'deduct' ? '-' : '+'}{val}
              </span>
            )},
            { header: 'Balance After', accessor: 'balance_after', render: (val) => <span className="font-bold text-slate-900">{val}</span> },
            { header: 'Reference', accessor: 'reference_label', render: (val, row) => <span className="text-[11px] text-slate-500">{val || row.source || '—'}</span> },
            { header: 'By', accessor: 'performed_by_name', render: (val) => <span className="text-slate-600">{val || 'System'}</span> }
          ]}
          data={filteredInventoryTxns}
          searchKeys={[(r) => r.product?.name, (r) => r.product_variant?.sku_variant, 'type', 'reference_label']}
          searchPlaceholder="Search inventory movement history..."
          emptyStateText="No inventory movements match the selected filters."
        />
        </div>
      ) : activeTab === 'labels' ? (
        <DataTable
          columns={[
            { header: 'Batch', accessor: 'batch_number', render: (val) => <span className="font-bold text-slate-800 font-mono text-[11px]">{val}</span> },
            { header: 'Date', accessor: 'createdAt', render: (val) => <span className="text-slate-600">{new Date(val).toLocaleString()}</span> },
            { header: 'Product', accessor: 'product_name', render: (val, row) => <span className="font-bold text-slate-800">{val || row.product?.name}</span> },
            { header: 'Size', accessor: 'size', render: (val) => <span className="text-slate-600">UK {val}</span> },
            { header: 'Barcode', accessor: 'barcode_value', render: (val) => <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[10px]">{val}</code> },
            { header: 'Labels', accessor: 'quantity', render: (val) => <span className="font-bold text-slate-900">{val}</span> },
            { header: 'Printed', accessor: 'print_count', render: (val) => <span className="text-slate-600">{val || 0}×</span> },
            { header: 'Downloaded', accessor: 'download_count', render: (val) => <span className="text-slate-600">{val || 0}×</span> },
            { header: 'Actions', accessor: '_id', sortable: false, render: (val, row) => (
              <button
                onClick={() => openBatchLabels(row)}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:underline"
              >
                <Printer className="w-3.5 h-3.5" /> Print / Download
              </button>
            )}
          ]}
          data={labelBatches}
          searchKeys={['batch_number', 'product_name', 'barcode_value']}
          searchPlaceholder="Search barcode label batches..."
          emptyStateText="No label batches yet. Add inventory to generate barcode labels."
        />
      ) : activeTab === 'alerts' ? (
        <DataTable 
          columns={liveStockColumns} 
          data={lowStockItems} 
          searchKeys={["name", "articleSku", "category", "size"]}
          searchPlaceholder="Search low-stock items..."
          emptyStateText="No low-stock variants. All stock is above the threshold."
        />
      ) : activeTab === 'transfer' ? (
        <DataTable 
          columns={transferColumns} 
          data={transferHistory} 
          searchKeys={["id", "product", "fromWh", "toWh"]}
          searchPlaceholder="Search stock transfers..."
        />
      ) : activeTab === 'warehouses' ? (
        <DataTable 
          columns={whColumns} 
          data={whList} 
          searchKeys={["name", "location", "manager"]}
          searchPlaceholder="Search warehouses..."
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6 text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-display">Stock Returns Ledger Queue</h3>
              <p className="text-xs text-slate-400 font-semibold font-sans">Process customer returns and defective shipments stock updates.</p>
            </div>
          </div>

          <form onSubmit={handleReturnStockSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-150">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Return Product SKU</label>
              <select
                value={returnForm.productId}
                onChange={(e) => setReturnForm({ ...returnForm, productId: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              >
                {stock.map(item => (
                  <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Return Pairs Count</label>
              <input 
                type="number"
                value={returnForm.qty}
                onChange={(e) => setReturnForm({ ...returnForm, qty: e.target.value })}
                placeholder="Pairs count"
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason / Status</label>
              <select
                value={returnForm.reason}
                onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              >
                <option value="Defective Product">Defective Product (Damaged Sole)</option>
                <option value="Wrong Size Ordered">Wrong Size Mapped</option>
                <option value="Customer Return">Customer Return (Sale Refund)</option>
              </select>
            </div>
            <button 
              type="submit"
              className="py-2.5 px-4 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Log Return Stock
            </button>
          </form>

          <DataTable 
            columns={[
              { header: "Return ID", accessor: "_id", render: (val) => <span className="font-bold text-slate-800 font-mono">{val}</span> },
              { header: "Product Variant", accessor: "product_id", render: (val) => {
                const target = stock.find(item => item.id === val);
                return <span className="font-bold text-slate-800">{target?.sku || val}</span>;
              }},
              { header: "Quantity Returned", accessor: "quantity", render: (val) => <span className="font-bold text-rose-600">+{val} pairs</span> },
              { header: "Reason", accessor: "reason" },
              { header: "Notes", accessor: "notes" },
              { header: "Returned By", accessor: "returned_by" },
              { header: "Timestamp", accessor: "createdAt", render: (val) => <span>{new Date(val).toLocaleString()}</span> }
            ]} 
            data={returnHistory} 
            searchKeys={["reason", "notes"]}
            searchPlaceholder="Search returned logs history..."
          />
        </div>
      )}

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isAddWhOpen}
        onClose={() => setIsAddWhOpen(false)}
        title="Add Facility Node"
        onConfirm={handleAddWarehouseSubmit}
      >
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Warehouse Name *</label>
            <input 
              type="text" 
              placeholder="e.g., Chennai Regional Whse"
              value={newWh.name}
              onChange={(e) => setNewWh({...newWh, name: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address Location *</label>
            <input 
              type="text" 
              placeholder="e.g. Bhiwandi, Maharashtra"
              value={newWh.location}
              onChange={(e) => setNewWh({...newWh, location: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Facility Manager</label>
              <select
                value={newWh.manager}
                onChange={(e) => setNewWh({...newWh, manager: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp.full_name || emp.name}>{emp.full_name || emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Capacity</label>
              <input 
                type="text" 
                placeholder="e.g. 15,000 SKUs"
                value={newWh.capacity}
                onChange={(e) => setNewWh({...newWh, capacity: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Stock Transfer Request Modal */}
      <Modal
        isOpen={isRaiseBulkOpen}
        onClose={() => setIsRaiseBulkOpen(false)}
        title="Raise Facility Stock Transfer Request"
        onConfirm={handleStockTransferSubmit}
      >
        <form className="space-y-4 text-left">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source Facility (From) *</label>
              <select
                value={transferData.fromWh}
                onChange={(e) => setTransferData({...transferData, fromWh: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              >
                {whList.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Facility (To) *</label>
              <select
                value={transferData.toWh}
                onChange={(e) => setTransferData({...transferData, toWh: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              >
                {whList.map(w => (
                  <option key={w.id} value={w.name}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Footwear Product SKU *</label>
              <select
                value={transferData.product}
                onChange={(e) => setTransferData({...transferData, product: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
              >
                {productVariants.map(pv => (
                  <option key={pv._id} value={pv.sku}>{pv.sku} — {pv.product?.name || 'Variant'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity Received (Pairs) *</label>
              <input 
                type="number" 
                value={transferData.qty}
                onChange={(e) => setTransferData({...transferData, qty: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none bg-white text-slate-800"
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Inventory Modal */}
      <Modal
        isOpen={isAddInventoryOpen}
        onClose={() => !addingStock && setIsAddInventoryOpen(false)}
        title="Add Stock & Generate Barcode Labels"
        maxWidth="max-w-2xl"
        onConfirm={handleAddInventorySubmit}
        confirmText={addingStock ? 'Adding...' : 'Add Inventory'}
        cancelText="Cancel"
      >
        <div className="space-y-4 text-left">
          <p className="text-xs text-slate-500 font-semibold">
            Select a category, product, size and quantity. On confirmation stock is added, history is recorded, and a printable barcode label batch opens.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">1. Product Category</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm({ ...addForm, category: e.target.value, product: '', size: '' })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">2. Product</label>
              <select
                value={addForm.product}
                onChange={(e) => setAddForm({ ...addForm, product: e.target.value, size: '' })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              >
                <option value="">Select product</option>
                {filteredProducts.map((p) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">3. Size</label>
              <select
                value={addForm.size}
                onChange={(e) => setAddForm({ ...addForm, size: e.target.value })}
                disabled={!addForm.product || variantsLoading}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 disabled:bg-slate-100"
              >
                <option value="">
                  {!addForm.product
                    ? 'Select a product first'
                    : variantsLoading
                      ? 'Loading sizes...'
                      : sizeOptions.length === 0
                        ? 'No sizes for this product'
                        : 'Select size'}
                </option>
                {sizeOptions.map((opt) => (
                  <option key={opt.size} value={opt.size}>
                    UK {opt.size} — in stock: {opt.totalStock}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">4. Quantity to Add</label>
              <input
                type="number"
                min="1"
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                placeholder="e.g. 50"
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              />
            </div>
          </div>
          {selectedSizeEntry && (
            <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs text-slate-600 flex items-center justify-between">
              <span>Current stock for UK {selectedSizeEntry.size}: <b className="text-slate-900">{selectedSizeEntry.totalStock}</b></span>
              {addForm.quantity && Number(addForm.quantity) > 0 && (
                <span className="text-emerald-600 font-bold">
                  → After add: {selectedSizeEntry.totalStock + Number(addForm.quantity)}
                </span>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Barcode Label Batch Popup */}
      <BarcodeLabelBatchModal
        isOpen={labelModalOpen}
        onClose={() => setLabelModalOpen(false)}
        batch={activeBatch}
        showToast={showToast}
      />

    </div>
  );
}
