import React, { useState, useEffect } from 'react';
import { ShoppingCart, QrCode, Plus, Eye, Printer, Scan, AlertTriangle, ShieldCheck, Camera, Laptop } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Purchase({ showToast }) {
  const [purchaseEntries, setPurchaseEntries] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [stock, setStock] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isQrMovementOpen, setIsQrMovementOpen] = useState(false);
  const [qrMovementType, setQrMovementType] = useState('IN'); // IN | OUT

  // Form states
  const [newEntry, setNewEntry] = useState({
    sku: '', name: '', article_no: '', colour: '', qty: '', vendor: 'Standard Sole Manufacturers'
  });
  
  const [qrForm, setQrForm] = useState({
    product_id: '',
    quantity: '',
    reference_id: '',
    notes: ''
  });

  const mapPurchaseOrder = (po) => {
    const firstItem = po.items?.[0] || {};
    return {
      id: po.po_number || po._id,
      _id: po._id,
      name: firstItem.item_name || 'Footwear Model',
      sku: po.sku || 'HDO-AC-RD-08',
      article_no: po.article_no || 'ART-AC-01',
      colour: po.colour || 'Red',
      qty: firstItem.quantity || po.qty || 100,
      vendor: po.vendor?.name || po.vendor || 'Standard Sole Manufacturers',
      date: po.createdAt ? new Date(po.createdAt).toISOString().split('T')[0] : '2026-06-08',
      status: po.status || 'Confirmed'
    };
  };

  const mapStock = (s) => ({
    id: s._id,
    sku: s.product_variant?.sku || s.sku || 'HDO-AC-RD-08',
    stockLevel: s.quantity || s.stockLevel || 0,
    warehouse: s.warehouse?.name || s.warehouse || 'Mumbai Central Whse',
    reorderLevel: s.reorder_level || 50,
    status: (s.quantity || s.stockLevel) <= (s.reorder_level || 50) ? 'Low Stock' : 'Normal'
  });

  const loadPurchaseData = () => {
    fetch('/api/purchase-orders')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setPurchaseEntries(resData.data.map(mapPurchaseOrder));
        }
      })
      .catch(err => console.error("Error loading purchase orders:", err));

    fetch('/api/products')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setProductsList(resData.data.map(p => ({
            id: p._id,
            name: p.name,
            sku: p.sku || 'HDO-AC-RD-08',
            article_no: p.article_no || 'ART-AC-01',
            colour: p.colour || 'Red'
          })));
        }
      })
      .catch(err => console.error("Error loading products:", err));

    fetch('/api/stock-records')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(mapStock);
          setStock(mapped);
          if (mapped.length > 0) {
            setQrForm(prev => ({ ...prev, product_id: mapped[0].id }));
          }
        }
      })
      .catch(err => console.error("Error loading stocks:", err));

    fetch('/api/vendors')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setVendors(resData.data);
          if (resData.data.length > 0) {
            setNewEntry(prev => ({ ...prev, vendor: resData.data[0].name }));
          }
        }
      })
      .catch(err => console.error("Error loading vendors:", err));
  };

  useEffect(() => {
    loadPurchaseData();
  }, []);

  // Print Barcode Sticker layout
  const handlePrintBarcode = (item) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast("Pop-up blocker prevented opening print page. Please allow popups.", "error");
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Sticker - ${item.sku}</title>
          <style>
            body { font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; margin: 0; background-color: #fff; }
            .sticker { border: 2px solid #1e293b; padding: 15px; border-radius: 8px; text-align: center; width: 280px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .title { font-size: 15px; font-weight: 800; margin-bottom: 4px; text-transform: uppercase; color: #0b1329; }
            .sku { font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
            .metadata { font-size: 10px; font-weight: bold; color: #334155; margin-bottom: 12px; display: flex; justify-content: space-around; }
            .date { font-size: 9px; color: #94a3b8; font-weight: bold; margin-top: 10px; border-t: 1px dashed #cbd5e1; padding-top: 8px; }
            #barcode { margin: 10px auto; max-width: 100%; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="sticker">
            <div class="title">${item.name}</div>
            <div class="sku">SKU: ${item.sku}</div>
            <div class="metadata">
              <span>ART: ${item.article_no || "N/A"}</span>
              <span>COLOUR: ${item.colour || "N/A"}</span>
            </div>
            <div style="font-size: 13px; font-weight: 800; margin-top: 5px; color: #0f172a;">
              M.R.P. RS. ${(item.mrp || 1499).toLocaleString('en-IN')}
            </div>
            <div style="font-size: 7.5px; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">
              (INCL. OF ALL TAXES / GST INCLUDED)
            </div>
            <svg id="barcode"></svg>
            <div class="date">PRINT DATE: ${new Date().toLocaleDateString()}</div>
          </div>
          <script>
            setTimeout(() => {
              try {
                JsBarcode("#barcode", "${item.sku}", {
                  format: "CODE128",
                  width: 1.8,
                  height: 50,
                  displayValue: true,
                  fontSize: 10
                });
                window.print();
                window.close();
              } catch (e) {
                console.error("Barcode generation failed", e);
                window.close();
              }
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    showToast(`Dispatched barcode print layout for SKU: ${item.sku}`, "success");
  };

  // Submit new purchase entry
  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newEntry.name || !newEntry.sku || !newEntry.qty) {
      showToast("Please complete the required form inputs.", "error");
      return;
    }

    const selectedVendorObj = vendors.find(v => v.name === newEntry.vendor) || vendors[0];
    if (!selectedVendorObj) {
      showToast("Please create a Vendor in backend first.", "error");
      return;
    }

    const payload = {
      vendor: selectedVendorObj._id,
      items: [{
        item_name: newEntry.name,
        quantity: Number(newEntry.qty),
        unit_price: 1200,
        total: Number(newEntry.qty) * 1200
      }],
      total_amount: Number(newEntry.qty) * 1200,
      status: "Confirmed"
    };

    fetch('/api/purchase-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          // Auto trigger QR In stock addition simulation
          fetch('/api/inventory/qr-in', {
            method: 'POST',
            body: JSON.stringify({
              product_id: stock[0]?.id || "INV001", 
              quantity: Number(newEntry.qty),
              purchase_id: resData.data?.po_number || `PO-${Date.now()}`,
              notes: "Automated arrival from purchase entry"
            })
          }).then(() => {
            showToast(`Purchase order saved and stock levels updated (+${newEntry.qty} pairs).`, "success");
            loadPurchaseData();
            setIsAddOpen(false);
            setNewEntry({ sku: '', name: '', article_no: '', colour: '', qty: '', vendor: vendors[0]?.name || '' });
          });
        } else {
          showToast(resData.message || "Failed to create purchase order.", "error");
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Error connecting to database.", "error");
      });
  };

  // QR Stock In / Out Submit
  const handleQrMovementSubmit = (e) => {
    e.preventDefault();
    if (!qrForm.quantity) {
      showToast("Quantity is required", "error");
      return;
    }

    const endpoint = qrMovementType === 'IN' ? '/api/inventory/qr-in' : '/api/inventory/qr-out';
    const bodyObj = qrMovementType === 'IN' 
      ? { product_id: qrForm.product_id, quantity: Number(qrForm.quantity), purchase_id: qrForm.reference_id || `PO-${Date.now()}`, notes: qrForm.notes, timestamp: new Date().toISOString() }
      : { product_id: qrForm.product_id, quantity: Number(qrForm.quantity), reference_id: qrForm.reference_id || `REF-${Date.now()}`, notes: qrForm.notes, timestamp: new Date().toISOString() };

    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(bodyObj)
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Movement request failed");
        }
        return data;
      })
      .then(data => {
        showToast(`QR Stock ${qrMovementType} recorded successfully.`, "success");
        setIsQrMovementOpen(false);
        setQrForm({ product_id: stock[0]?.id || '', quantity: '', reference_id: '', notes: '' });
        loadPurchaseData();
      })
      .catch(err => {
        showToast(err.message, "error");
      });
  };

  // Initialize html5-qrcode scanner inside modal
  const [scannerTab, setScannerTab] = useState('sim'); // sim | camera
  useEffect(() => {
    let html5QrcodeScanner = null;
    if (isScanOpen && scannerTab === 'camera') {
      const onScanSuccess = (decodedText, decodedResult) => {
        handleBarcodeMatch(decodedText);
      };
      
      const onScanFailure = (error) => {};

      html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(err => console.error("Scanner clear error", err));
      }
    };
  }, [isScanOpen, scannerTab]);

  const handleBarcodeMatch = (code) => {
    const matched = productsList.find(p => p.sku === code || p.article_no === code || p.name.toLowerCase().includes(code.toLowerCase()));
    
    if (matched) {
      setNewEntry({
        ...newEntry,
        sku: matched.sku || "HDO-AC-RD-08",
        name: matched.name,
        article_no: matched.article_no || "ART-AC-01",
        colour: matched.colour || "Red"
      });
      setIsScanOpen(false);
      showToast(`Scanned product matched: ${matched.name}`, "success");
    } else {
      showToast(`Scanned code "${code}" does not match any registered product SKU.`, "error");
    }
  };

  const columns = [
    { header: "PO Number", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono">{val}</span> },
    { header: "Product Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "SKU Code", accessor: "sku", render: (val) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-600 font-mono">{val}</code> },
    { header: "Article No.", accessor: "article_no" },
    { header: "Colour", accessor: "colour" },
    { header: "Qty Received", accessor: "qty", render: (val) => <span className="font-bold text-slate-800">{val} pairs</span> },
    { header: "Vendor Source", accessor: "vendor" },
    { header: "Date Entry", accessor: "date" },
    { header: "Label Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button 
        onClick={() => handlePrintBarcode(row)}
        className="flex items-center gap-1 px-3 py-1 bg-white border border-slate-200 hover:border-brand-orange hover:text-brand-orange rounded text-xs font-bold text-slate-700 transition-colors shadow-xs"
      >
        <Printer className="w-3.5 h-3.5" />
        <span>Print Barcode</span>
      </button>
    )}
  ];

  // Compute stats dynamically
  const totalPurchases = purchaseEntries.reduce((sum, po) => sum + po.qty, 0);
  const totalSkus = stock.length;

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <ShoppingCart className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Purchases (This Month)</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">{totalPurchases} Pairs</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <QrCode className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Tracked Inventory SKUs</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">{totalSkus} Active Styles</h3>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center gap-4">
          <span className="p-3 bg-orange-50 text-brand-orange rounded-xl border border-orange-100">
            <Scan className="w-6 h-6" />
          </span>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Quality Checks Done</span>
            <h3 className="text-xl font-bold text-slate-800 font-display mt-0.5">100% Verified</h3>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Entry</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => { setQrMovementType('IN'); setIsQrMovementOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>QR Stock IN</span>
          </button>
          <button 
            onClick={() => { setQrMovementType('OUT'); setIsQrMovementOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            <QrCode className="w-4 h-4 text-rose-600" />
            <span>QR Stock OUT</span>
          </button>
        </div>
      </div>

      {/* Purchase Entries Table */}
      <DataTable 
        columns={columns} 
        data={purchaseEntries} 
        searchKeys={["id", "name", "sku", "vendor"]}
        searchPlaceholder="Search purchase entries..."
      />

      {/* Create Purchase Entry Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create Purchase Entry"
        onConfirm={handleAddSubmit}
      >
        <form className="space-y-4 text-left">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product SKU / Barcode *</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Scan or enter SKU (e.g. HDO-AC-RD-08)" 
                value={newEntry.sku}
                onChange={(e) => setNewEntry({...newEntry, sku: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white text-slate-800"
                required
              />
              <button 
                type="button"
                onClick={() => setIsScanOpen(true)}
                className="px-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 transition-colors"
                title="Scan Barcode using Camera"
              >
                <Scan className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name *</label>
              <input 
                type="text" 
                placeholder="Product Name" 
                value={newEntry.name}
                onChange={(e) => setNewEntry({...newEntry, name: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-none font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity Received *</label>
              <input 
                type="number" 
                placeholder="Pairs Count" 
                value={newEntry.qty}
                onChange={(e) => setNewEntry({...newEntry, qty: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none bg-white text-slate-800"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Article No.</label>
              <input 
                type="text" 
                placeholder="Article Number" 
                value={newEntry.article_no}
                onChange={(e) => setNewEntry({...newEntry, article_no: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Colour</label>
              <input 
                type="text" 
                placeholder="Colour" 
                value={newEntry.colour}
                onChange={(e) => setNewEntry({...newEntry, colour: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-800 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendor Supplier *</label>
            <select
              value={newEntry.vendor}
              onChange={(e) => setNewEntry({...newEntry, vendor: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
            >
              {vendors.length === 0 ? (
                <>
                  <option value="Standard Sole Manufacturers">Standard Sole Manufacturers</option>
                  <option value="Comfort Rubber Ltd">Comfort Rubber Ltd</option>
                  <option value="Derby Leather Tannery">Derby Leather Tannery</option>
                </>
              ) : (
                vendors.map(v => (
                  <option key={v._id} value={v.name}>{v.name}</option>
                ))
              )}
            </select>
          </div>
        </form>
      </Modal>

      {/* Barcode Scanner popup Modal */}
      <Modal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        title="Mobile Barcode Scanner"
      >
        <div className="space-y-4">
          <div className="flex border-b border-slate-200 p-0.5 bg-slate-100 rounded-lg">
            <button 
              onClick={() => setScannerTab('sim')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${scannerTab === 'sim' ? 'bg-white text-brand-orange shadow-xs' : 'text-slate-500'}`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Mock Scanner Simulator</span>
            </button>
            <button 
              onClick={() => setScannerTab('camera')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-md transition-all ${scannerTab === 'camera' ? 'bg-white text-brand-orange shadow-xs' : 'text-slate-500'}`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Hardware</span>
            </button>
          </div>

          {scannerTab === 'sim' ? (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-brand-orange flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Select a product to simulate a barcode camera scan on your desktop or simulator environment.</p>
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {productsList.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">No products in database.</div>
                ) : (
                  productsList.map(prod => (
                    <button 
                      key={prod.id}
                      type="button"
                      onClick={() => handleBarcodeMatch(prod.sku)}
                      className="w-full p-2.5 text-left text-xs hover:bg-slate-50 flex items-center justify-between font-semibold"
                    >
                      <span className="text-slate-800">{prod.name} ({prod.colour})</span>
                      <code className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-mono">{prod.sku}</code>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex flex-col items-center">
              <div id="reader" className="w-full bg-slate-50 rounded-lg overflow-hidden border border-slate-200"></div>
            </div>
          )}
        </div>
      </Modal>

      {/* QR Code movement entry Modal */}
      <Modal
        isOpen={isQrMovementOpen}
        onClose={() => setIsQrMovementOpen(false)}
        title={`QR Stock Movement - ${qrMovementType}`}
        onConfirm={handleQrMovementSubmit}
      >
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Inventory SKU *</label>
            <select
              value={qrForm.product_id}
              onChange={(e) => setQrForm({...qrForm, product_id: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
            >
              {stock.map(item => (
                <option key={item.id} value={item.id}>{item.sku} — {item.warehouse} (Current: {item.stockLevel} pairs)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity Received *</label>
              <input 
                type="number" 
                placeholder="Pairs Count" 
                value={qrForm.quantity}
                onChange={(e) => setQrForm({...qrForm, quantity: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none bg-white text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference ID (e.g., PO No.)</label>
              <input 
                type="text" 
                placeholder="e.g. PO-2026-001" 
                value={qrForm.reference_id}
                onChange={(e) => setQrForm({...qrForm, reference_id: e.target.value})}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none bg-white text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Audit Notes / Comments</label>
            <textarea 
              rows="3" 
              placeholder="Comments on stock movement..."
              value={qrForm.notes}
              onChange={(e) => setQrForm({...qrForm, notes: e.target.value})}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none"
            />
          </div>
        </form>
      </Modal>

    </div>
  );
}
