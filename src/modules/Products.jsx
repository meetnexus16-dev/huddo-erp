import React, { useState } from 'react';
import { Package, Grid, List, Plus, Eye, DollarSign, Edit, Save, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { initialProducts } from '../mockData';
import { DataTable, Modal } from '../components/Common';

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

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  const prefix = import.meta.env.VITE_API_URL || '';
  if (url.startsWith('/')) {
    return `${prefix}${url}`;
  }
  return `${prefix}/${url}`;
};

export default function Products({ showToast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  React.useEffect(() => {
    // Fetch categories first
    fetch('/api/product-categories')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          setCategories(resData.data);
        }
      })
      .catch(err => console.error("Error loading categories:", err));

    // Fetch products
    fetch('/api/products')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(p => ({
            id: p.sku || p._id,
            _id: p._id,
            name: p.name,
            image: p.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
            category: p.category?.name || p.category || 'Sports Shoes',
            categoryId: p.category?._id || p.category,
            description: p.description || '',
            sizes: p.sizes && p.sizes.length > 0 ? p.sizes.map(Number) : [6, 7, 8, 9, 10, 11],
            colors: p.colors && p.colors.length > 0 ? p.colors : ["#EF4444", "#1F2937"],
            mrp: p.mrp || 2999,
            costPrice: p.costPrice || 1200,
            margin: p.margin || 25,
            status: p.lifecycle_status === 'Active' ? 'Active' : 'Inactive',
            retailerMargin: p.retailerMargin || 25,
            cityManagerIncentive: p.cityManagerIncentive || 2,
            stateManagerIncentive: p.stateManagerIncentive || 1,
            hsn_code: p.hsn_code || '6403.99.90',
            article_no: p.sku || 'ART-AC-01',
            colour: p.colour || 'Red',
            franchise_points: p.franchise_points || 12.5,
            colorConfigs: p.colorConfigs || {}
          }));
          setProducts(mapped);
        } else {
          setProducts(initialProducts);
        }
      })
      .catch(err => {
        console.error("Error loading products:", err);
        setProducts(initialProducts);
      });
  }, []);

  const [viewMode, setViewMode] = useState('grid'); // grid | list | edit
  const [viewingProd, setViewingProd] = useState(null);
  const [prodTab, setProdTab] = useState('overview'); // overview | matrix | commissions

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Form states (unified for Add and Edit)
  const [formData, setFormData] = useState({
    name: '', category: 'Sports Shoes', description: '',
    sizes: [6, 7, 8, 9, 10], colors: ["#EF4444", "#1F2937"],
    mrp: '', costPrice: '', status: 'Active',
    hsn_code: '', article_no: '', colour: '', franchise_points: '',
    retailerMargin: 20, cityManagerIncentive: 2, stateManagerIncentive: 1,
    image: '', colorConfigs: {}, imageFile: null, colorImageFiles: {}
  });
  const [customColorVal, setCustomColorVal] = useState('#EF4444');
  const [bulkAdjustment, setBulkAdjustment] = useState({ type: 'percent', value: '' });

  // Edit identifier state
  const [editingProd, setEditingProd] = useState(null);

  const handleImageUpload = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload/single', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.success) {
        return data.data.url;
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      showToast('Image upload failed: ' + err.message, 'error');
      return null;
    }
  };

  const handleColorModeChange = (col, mode) => {
    setFormData(prev => {
      const newConfigs = { ...prev.colorConfigs };
      newConfigs[col] = {
        mode,
        image: mode === 'main' ? '' : (newConfigs[col]?.image || '')
      };
      return { ...prev, colorConfigs: newConfigs };
    });
  };

  const handleColorImageChange = (col, imageUrl) => {
    setFormData(prev => {
      const newConfigs = { ...prev.colorConfigs };
      newConfigs[col] = {
        ...newConfigs[col],
        image: imageUrl
      };
      return { ...prev, colorConfigs: newConfigs };
    });
  };

  const handleColorImageRemove = (col) => {
    setFormData(prev => {
      const newConfigs = { ...prev.colorConfigs };
      newConfigs[col] = {
        ...newConfigs[col],
        image: ''
      };
      const newFiles = { ...prev.colorImageFiles };
      delete newFiles[col];
      return { ...prev, colorConfigs: newConfigs, colorImageFiles: newFiles };
    });
  };



  const handleInspect = (prod) => {
    const id = prod._id || prod.id;
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success && resData.data) {
          const p = resData.data;
          setViewingProd({
            ...prod,
            variants: p.variants || [],
            colorConfigs: p.colorConfigs || {}
          });
          setProdTab('overview');
        } else {
          setViewingProd(prod);
          setProdTab('overview');
        }
      })
      .catch(err => {
        console.error("Error loading product details:", err);
        setViewingProd(prod);
        setProdTab('overview');
      });
  };

  const handleAddSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name || !formData.mrp || !formData.costPrice || !formData.article_no || !formData.hsn_code || !formData.franchise_points) {
      showToast("Please fill all required footwear parameters.", "error");
      return;
    }
    if (!formData.image) {
      showToast("Please upload a main product image.", "error");
      return;
    }
    if (Number(formData.mrp) <= 0 || Number(formData.costPrice) <= 0) {
      showToast("MRP and Cost Price must be greater than zero.", "error");
      return;
    }
    if (Number(formData.costPrice) > Number(formData.mrp)) {
      showToast("Cost Price cannot be greater than MRP.", "error");
      return;
    }
    if (Number(formData.franchise_points) < 0) {
      showToast("Franchise Points must be non-negative.", "error");
      return;
    }

    // Resolve category name/ID
    let resolvedCategory = formData.category;
    let categoryName = formData.category;
    const foundCat = categories.find(c => c._id === formData.category || c.name === formData.category);
    if (foundCat) {
      resolvedCategory = foundCat._id;
      categoryName = foundCat.name;
    } else if (categories.length > 0) {
      resolvedCategory = categories[0]._id;
      categoryName = categories[0].name;
    }

    const marginVal = Math.round(((Number(formData.mrp) - Number(formData.costPrice)) / Number(formData.mrp)) * 100);
    const resolvedColors = formData.colors.length > 0 ? formData.colors : ["#EF4444", "#1F2937"];
    const resolvedColour = resolvedColors.map(c => COLOR_NAMES[c] || c).join(" / ");

    const fd = new FormData();
    fd.append('name', formData.name);
    fd.append('sku', formData.article_no);
    fd.append('description', formData.description);
    fd.append('is_active', formData.status === 'Active' ? 'true' : 'false');
    fd.append('category', resolvedCategory);
    fd.append('sizes', JSON.stringify(formData.sizes));
    fd.append('colors', JSON.stringify(resolvedColors));
    fd.append('colour', resolvedColour);
    fd.append('mrp', String(formData.mrp));
    fd.append('costPrice', String(formData.costPrice));
    fd.append('margin', String(marginVal));
    fd.append('retailerMargin', String(formData.retailerMargin));
    fd.append('cityManagerIncentive', String(formData.cityManagerIncentive));
    fd.append('stateManagerIncentive', String(formData.stateManagerIncentive));
    fd.append('hsn_code', formData.hsn_code);
    fd.append('franchise_points', String(formData.franchise_points));

    const colorConfigsClean = {};
    for (const color of resolvedColors) {
      const conf = formData.colorConfigs[color] || { mode: 'main', image: '' };
      colorConfigsClean[color] = {
        mode: conf.mode,
        image: conf.image && conf.image.startsWith('blob:') ? '' : conf.image
      };
    }
    fd.append('colorConfigs', JSON.stringify(colorConfigsClean));

    if (formData.imageFile) {
      fd.append('image', formData.imageFile);
    } else {
      fd.append('image', formData.image);
    }

    if (formData.colorImageFiles) {
      for (const color of Object.keys(formData.colorImageFiles)) {
        const file = formData.colorImageFiles[color];
        if (file) {
          fd.append(`colorImage_${color}`, file);
        }
      }
    }

    // Save to database
    fetch('/api/products', {
      method: 'POST',
      body: fd
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const addedDbProd = data.data;
        const newLocalProd = {
          id: addedDbProd.sku || addedDbProd._id,
          _id: addedDbProd._id,
          name: addedDbProd.name,
          image: addedDbProd.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
          category: categoryName,
          categoryId: resolvedCategory,
          description: addedDbProd.description || '',
          sizes: addedDbProd.sizes && addedDbProd.sizes.length > 0 ? addedDbProd.sizes.map(Number) : formData.sizes,
          colors: addedDbProd.colors && addedDbProd.colors.length > 0 ? addedDbProd.colors : resolvedColors,
          mrp: Number(addedDbProd.mrp || formData.mrp),
          costPrice: Number(addedDbProd.costPrice || formData.costPrice),
          margin: addedDbProd.margin || marginVal,
          status: addedDbProd.is_active ? 'Active' : 'Inactive',
          retailerMargin: Number(addedDbProd.retailerMargin !== undefined ? addedDbProd.retailerMargin : formData.retailerMargin),
          cityManagerIncentive: Number(addedDbProd.cityManagerIncentive !== undefined ? addedDbProd.cityManagerIncentive : formData.cityManagerIncentive),
          stateManagerIncentive: Number(addedDbProd.stateManagerIncentive !== undefined ? addedDbProd.stateManagerIncentive : formData.stateManagerIncentive),
          hsn_code: addedDbProd.hsn_code || formData.hsn_code,
          article_no: addedDbProd.sku || formData.article_no,
          colour: addedDbProd.colour || resolvedColour,
          franchise_points: Number(addedDbProd.franchise_points || formData.franchise_points) || 0,
          colorConfigs: addedDbProd.colorConfigs || {}
        };
        setProducts([...products, newLocalProd]);
        handleCloseModal();
        showToast(`Product "${newLocalProd.name}" added successfully with variants.`, "success");
      } else {
        showToast(data.message || "Failed to save product in database.", "error");
      }
    })
    .catch(err => {
      console.error("Failed to save product:", err);
      showToast("Network error: Failed to save product.", "error");
    });
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setEditingProd(null);
    setFormData({
      name: '',
      category: categories[0]?._id || 'Sports Shoes',
      description: '',
      sizes: [6, 7, 8, 9, 10],
      colors: ["#EF4444", "#1F2937"],
      mrp: '',
      costPrice: '',
      status: 'Active',
      hsn_code: '',
      article_no: '',
      colour: '',
      franchise_points: '',
      retailerMargin: 20,
      cityManagerIncentive: 2,
      stateManagerIncentive: 1,
      image: '',
      imageFile: null,
      colorConfigs: {},
      colorImageFiles: {}
    });
  };

  const handleStartAdd = () => {
    setEditingProd(null);
    setFormData({
      name: '',
      category: categories[0]?._id || 'Sports Shoes',
      description: '',
      sizes: [6, 7, 8, 9, 10],
      colors: ["#EF4444", "#1F2937"],
      mrp: '',
      costPrice: '',
      status: 'Active',
      hsn_code: '',
      article_no: '',
      colour: '',
      franchise_points: '',
      retailerMargin: 20,
      cityManagerIncentive: 2,
      stateManagerIncentive: 1,
      image: '',
      imageFile: null,
      colorConfigs: {},
      colorImageFiles: {}
    });
    setIsAddOpen(true);
  };

  const handleStartEdit = (prod) => {
    setEditingProd(prod);
    setFormData({
      name: prod.name || '',
      category: prod.categoryId || prod.category?._id || prod.category || '',
      description: prod.description || '',
      sizes: prod.sizes ? prod.sizes.map(Number) : [6, 7, 8, 9, 10, 11],
      colors: prod.colors || ["#EF4444", "#1F2937"],
      mrp: prod.mrp || '',
      costPrice: prod.costPrice || '',
      status: prod.status || 'Active',
      hsn_code: prod.hsn_code || '',
      article_no: prod.article_no || prod.sku || '',
      colour: prod.colour || '',
      franchise_points: prod.franchise_points || '',
      retailerMargin: prod.retailerMargin !== undefined ? prod.retailerMargin : 20,
      cityManagerIncentive: prod.cityManagerIncentive !== undefined ? prod.cityManagerIncentive : 2,
      stateManagerIncentive: prod.stateManagerIncentive !== undefined ? prod.stateManagerIncentive : 1,
      image: prod.image || '',
      imageFile: null,
      colorConfigs: prod.colorConfigs || {},
      colorImageFiles: {}
    });
    setIsAddOpen(true);
  };

  const handleEditSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name || !formData.mrp || !formData.costPrice || !formData.article_no || !formData.hsn_code || !formData.franchise_points) {
      showToast("Please fill all required footwear parameters.", "error");
      return;
    }
    if (!formData.image) {
      showToast("Please upload a main product image.", "error");
      return;
    }
    if (Number(formData.mrp) <= 0 || Number(formData.costPrice) <= 0) {
      showToast("MRP and Cost Price must be greater than zero.", "error");
      return;
    }
    if (Number(formData.costPrice) > Number(formData.mrp)) {
      showToast("Cost Price cannot be greater than MRP.", "error");
      return;
    }
    if (Number(formData.franchise_points) < 0) {
      showToast("Franchise Points must be non-negative.", "error");
      return;
    }

    // Resolve category name/ID
    let resolvedCategory = formData.category;
    let categoryName = formData.category;
    const foundCat = categories.find(c => c._id === formData.category || c.name === formData.category);
    if (foundCat) {
      resolvedCategory = foundCat._id;
      categoryName = foundCat.name;
    } else if (categories.length > 0) {
      resolvedCategory = categories[0]._id;
      categoryName = categories[0].name;
    }

    const marginVal = Math.round(((Number(formData.mrp) - Number(formData.costPrice)) / Number(formData.mrp)) * 100);
    const resolvedColors = formData.colors.length > 0 ? formData.colors : ["#EF4444", "#1F2937"];
    const resolvedColour = resolvedColors.map(c => COLOR_NAMES[c] || c).join(" / ");

    const fd = new FormData();
    fd.append('name', formData.name);
    fd.append('sku', formData.article_no);
    fd.append('description', formData.description);
    fd.append('is_active', formData.status === 'Active' ? 'true' : 'false');
    fd.append('category', resolvedCategory);
    fd.append('sizes', JSON.stringify(formData.sizes));
    fd.append('colors', JSON.stringify(resolvedColors));
    fd.append('colour', resolvedColour);
    fd.append('mrp', String(formData.mrp));
    fd.append('costPrice', String(formData.costPrice));
    fd.append('margin', String(marginVal));
    fd.append('retailerMargin', String(formData.retailerMargin));
    fd.append('cityManagerIncentive', String(formData.cityManagerIncentive));
    fd.append('stateManagerIncentive', String(formData.stateManagerIncentive));
    fd.append('hsn_code', formData.hsn_code);
    fd.append('franchise_points', String(formData.franchise_points));

    const colorConfigsClean = {};
    for (const color of resolvedColors) {
      const conf = formData.colorConfigs[color] || { mode: 'main', image: '' };
      colorConfigsClean[color] = {
        mode: conf.mode,
        image: conf.image && conf.image.startsWith('blob:') ? '' : conf.image
      };
    }
    fd.append('colorConfigs', JSON.stringify(colorConfigsClean));

    if (formData.imageFile) {
      fd.append('image', formData.imageFile);
    } else {
      fd.append('image', formData.image);
    }

    if (formData.colorImageFiles) {
      for (const color of Object.keys(formData.colorImageFiles)) {
        const file = formData.colorImageFiles[color];
        if (file) {
          fd.append(`colorImage_${color}`, file);
        }
      }
    }

    const prodId = editingProd._id || editingProd.id;
    fetch(`/api/products/${prodId}`, {
      method: 'PUT',
      body: fd
    })
    .then(async res => {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const updatedDbProd = data.data;
        // Update local React state
        setProducts(products.map(p => (p._id === prodId || p.id === prodId) ? {
          ...p,
          name: updatedDbProd.name,
          category: categoryName,
          categoryId: resolvedCategory,
          description: updatedDbProd.description || '',
          sizes: updatedDbProd.sizes && updatedDbProd.sizes.length > 0 ? updatedDbProd.sizes.map(Number) : formData.sizes,
          colors: updatedDbProd.colors && updatedDbProd.colors.length > 0 ? updatedDbProd.colors : resolvedColors,
          mrp: Number(updatedDbProd.mrp || formData.mrp),
          costPrice: Number(updatedDbProd.costPrice || formData.costPrice),
          margin: updatedDbProd.margin || marginVal,
          status: updatedDbProd.is_active ? 'Active' : 'Inactive',
          retailerMargin: Number(updatedDbProd.retailerMargin !== undefined ? updatedDbProd.retailerMargin : formData.retailerMargin),
          cityManagerIncentive: Number(updatedDbProd.cityManagerIncentive !== undefined ? updatedDbProd.cityManagerIncentive : formData.cityManagerIncentive),
          stateManagerIncentive: Number(updatedDbProd.stateManagerIncentive !== undefined ? updatedDbProd.stateManagerIncentive : formData.stateManagerIncentive),
          hsn_code: updatedDbProd.hsn_code || formData.hsn_code,
          article_no: updatedDbProd.sku || formData.article_no,
          colour: updatedDbProd.colour || resolvedColour,
          franchise_points: Number(updatedDbProd.franchise_points || formData.franchise_points) || 0,
          image: updatedDbProd.image || formData.image,
          colorConfigs: updatedDbProd.colorConfigs || {},
          variants: updatedDbProd.variants || []
        } : p));
        
        showToast(`Product "${formData.name}" updated successfully.`, "success");
        handleCloseModal();
      } else {
        showToast(data.message || "Failed to update product.", "error");
      }
    })
    .catch(err => {
      console.error("Failed to update product:", err);
      showToast("Network error: Failed to update product.", "error");
    });
  };

  const handleBulkPriceUpdate = () => {
    const factor = 1 + (Number(bulkAdjustment.value) / 100);
    setProducts(products.map(p => {
      const updatedMrp = Math.round(p.mrp * factor);
      const updatedCost = Math.round(p.costPrice * factor);
      const updatedMargin = Math.round(((updatedMrp - updatedCost) / updatedMrp) * 100);
      return {
        ...p,
        mrp: updatedMrp,
        costPrice: updatedCost,
        margin: updatedMargin
      };
    }));
    setIsBulkOpen(false);
    showToast(`Bulk updated all catalogue product prices by ${bulkAdjustment.value}%.`, "success");
  };

  const handleSaveCommissions = async (id, retM, cityM, stateM) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerMargin: Number(retM),
          cityManagerIncentive: Number(cityM),
          stateManagerIncentive: Number(stateM)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        setProducts(products.map(p => 
          (p.id === id || p._id === id) ? { 
            ...p, 
            retailerMargin: Number(retM), 
            cityManagerIncentive: Number(cityM), 
            stateManagerIncentive: Number(stateM) 
          } : p
        ));
        showToast("Product commission structure updated.", "success");
      } else {
        showToast(data.message || "Failed to update commission structure.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update commission structure.", "error");
    }
  };

  const toggleSizeCheckbox = (sz) => {
    if (formData.sizes.includes(sz)) {
      setFormData({ ...formData, sizes: formData.sizes.filter(s => s !== sz) });
    } else {
      setFormData({ ...formData, sizes: [...formData.sizes, sz] });
    }
  };

  const toggleColorAdd = (hex) => {
    const isSelected = formData.colors.includes(hex);
    const newColors = isSelected 
      ? formData.colors.filter(c => c !== hex)
      : [...formData.colors, hex];
    const resolvedColour = newColors.map(c => COLOR_NAMES[c] || c).join(" / ");
    
    // Initialize colorConfigs for the new color if it doesn't exist
    const newConfigs = { ...formData.colorConfigs };
    if (!newConfigs[hex]) {
      newConfigs[hex] = { mode: 'main', image: '' };
    }

    setFormData({ 
      ...formData, 
      colors: newColors,
      colour: resolvedColour,
      colorConfigs: newConfigs
    });
  };

  const toggleColorEdit = (hex) => {
    const isSelected = editFormData.colors.includes(hex);
    const newColors = isSelected 
      ? editFormData.colors.filter(c => c !== hex)
      : [...editFormData.colors, hex];
    const resolvedColour = newColors.map(c => COLOR_NAMES[c] || c).join(" / ");
    
    // Initialize colorConfigs for the new color if it doesn't exist
    const newConfigs = { ...editFormData.colorConfigs };
    if (!newConfigs[hex]) {
      newConfigs[hex] = { mode: 'main', image: '' };
    }

    setEditFormData({ 
      ...editFormData, 
      colors: newColors,
      colour: resolvedColour,
      colorConfigs: newConfigs
    });
  };

  // List View Columns
  const columns = [
    { header: "Catalog Image", accessor: "image", sortable: false, render: (val, row) => (
      <img src={getImageUrl(val)} alt={row.name} className="w-10 h-10 object-cover rounded-lg border border-slate-100" />
    )},
    { header: "Product Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Article No.", accessor: "article_no" },
    { header: "Category", accessor: "category" },
    { header: "MRP (₹)", accessor: "mrp", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> },
    { header: "Franchise Cost Price (₹)", accessor: "costPrice", render: (val) => <span className="font-medium text-slate-500">₹{val.toLocaleString('en-IN')}</span> },
    { header: "HSN Code", accessor: "hsn_code" },
    { header: "Colour", accessor: "colour" },
    { header: "Franchise Points", accessor: "franchise_points", render: (val) => <span className="font-bold text-indigo-600">{val} pts</span> },
    { header: "Gross Margin", accessor: "margin", render: (val) => <span className="font-bold text-emerald-600">{val}%</span> },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {val}
      </span>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button onClick={() => handleInspect(row)} className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200 transition-colors">
          Inspect
        </button>
        <button onClick={() => handleStartEdit(row)} className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs rounded hover:bg-indigo-100 transition-colors">
          Edit
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Product Catalog</h1>
          <p className="text-sm text-slate-500">Maintain footwear stocks, set regional wholesale markup margins, configure multi-level commission incentive points.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button 
            onClick={() => setIsBulkOpen(true)}
            className="px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white transition-colors"
          >
            Bulk Price Adjust
          </button>
          
          <button 
            onClick={handleStartAdd}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Footwear</span>
          </button>
        </div>
      </div>

      {/* Grid vs List Toggles */}
      <div className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
        <span className="text-xs font-bold text-slate-500">{products.length} footwear items registered</span>
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white text-brand-orange shadow-xs' : 'text-slate-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white text-brand-orange shadow-xs' : 'text-slate-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Main content display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {products.map(prod => (
            <div 
              key={prod.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-brand-orange hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative"
            >
              <div className="relative overflow-hidden">
                <img src={getImageUrl(prod.image)} alt={prod.name} className="w-full h-44 object-cover border-b border-slate-100" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleInspect(prod); }}
                    className="p-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(prod); }}
                    className="p-2 bg-brand-orange text-white rounded-lg hover:bg-brand-orange-hover transition-colors shadow-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
              <div 
                onClick={() => handleInspect(prod)}
                className="p-4 flex-1 flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400">{prod.category}</span>
                  <h3 className="text-sm font-bold text-slate-800 font-display mt-0.5">{prod.name}</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Sizes: {prod.sizes.join(", ")}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-bold text-slate-900 text-sm">₹{prod.mrp.toLocaleString('en-IN')}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${prod.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{prod.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable 
          columns={columns} 
          data={products} 
          searchKeys={["name", "category"]} 
          searchPlaceholder="Search footwear catalog..."
        />
      )}

      {/* Unified Add / Edit Product Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={handleCloseModal}
        title={editingProd ? "Edit Footwear Product" : "Add Footwear Product"}
        onConfirm={editingProd ? handleEditSubmit : handleAddSubmit}
        confirmText={editingProd ? "Save Changes" : "Add Footwear"}
        maxWidth="max-w-4xl"
      >
        <div className="text-xs text-slate-500 font-semibold mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>{editingProd ? `Modify specifications for SKU: ${editingProd.sku || editingProd.article_no}` : "Configure basic parameters, sizing, color variants, and images."}</span>
          <span className="text-[10px] text-rose-500">* Required fields</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form Details & Configurations (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Footwear Product Name *</label>
              <input 
                type="text" 
                placeholder="e.g. Huddo Flex Alpha" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Category</label>
                <select 
                  value={formData.category} 
                  onChange={(e) => setFormData({...formData, category: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  {categories.length > 0 ? (
                    categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Sports Shoes">Sports Shoes</option>
                      <option value="Formal Shoes">Formal Shoes</option>
                      <option value="Casual Shoes">Casual Shoes</option>
                      <option value="Sandals">Sandals</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Catalog Status</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({...formData, status: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Available UK Sizes</label>
              <div className="flex gap-1.5 flex-wrap bg-slate-50 border border-slate-100 rounded-xl p-3">
                {[5, 6, 7, 8, 9, 10, 11, 12].map(sz => {
                  const isSelected = formData.sizes.includes(sz);
                  return (
                    <button 
                      key={sz}
                      type="button"
                      onClick={() => toggleSizeCheckbox(sz)}
                      className={`w-9 h-9 rounded-lg text-xs border font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-brand-orange border-brand-orange text-white shadow-xs font-extrabold' 
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Select Available Colors</label>
              <div className="flex gap-2 flex-wrap bg-slate-50 border border-slate-100 rounded-xl p-3">
                {Object.entries(COLOR_NAMES).map(([hex, name]) => {
                  const isSelected = formData.colors.includes(hex);
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => toggleColorAdd(hex)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-white border-brand-orange text-slate-800 shadow-xs ring-2 ring-brand-orange/20' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-xxs" 
                        style={{ backgroundColor: hex }}
                      />
                      <span>{name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {formData.colors.length > 0 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Color-specific Configurations</label>
                <div className="grid grid-cols-1 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {formData.colors.map(col => {
                    const config = formData.colorConfigs[col] || { mode: 'main', image: '' };
                    return (
                      <div key={col} className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-2 shadow-xxs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-slate-300 shadow-xxs" style={{ backgroundColor: col }} />
                            <span className="text-xs font-bold text-slate-700">{COLOR_NAMES[col] || col}</span>
                          </div>
                          <div className="flex bg-slate-200/50 p-0.5 rounded-lg text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleColorModeChange(col, 'main')}
                              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${config.mode === 'main' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                            >
                              Use Main
                            </button>
                            <button
                              type="button"
                              onClick={() => handleColorModeChange(col, 'custom')}
                              className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${config.mode === 'custom' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'}`}
                            >
                              Custom
                            </button>
                          </div>
                        </div>
                        
                        {config.mode === 'custom' && (
                          <div className="flex items-center gap-3 w-full">
                            {config.image ? (
                              <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden group shadow-xxs">
                                <img src={getImageUrl(config.image)} alt={col} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleColorImageRemove(col)}
                                  className="absolute inset-0 bg-rose-600/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <label className="w-full h-11 flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-brand-orange bg-white rounded-lg cursor-pointer transition-colors shadow-xxs">
                                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                  <Plus className="w-3.5 h-3.5 text-slate-400" /> Upload color-variant image
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      const file = e.target.files[0];
                                      const localUrl = URL.createObjectURL(file);
                                      setFormData(prev => {
                                        const newConfigs = { ...prev.colorConfigs };
                                        newConfigs[col] = {
                                          ...newConfigs[col],
                                          image: localUrl,
                                          mode: 'custom'
                                        };
                                        const newFiles = { ...prev.colorImageFiles || {} };
                                        newFiles[col] = file;
                                        return { ...prev, colorConfigs: newConfigs, colorImageFiles: newFiles };
                                      });
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing, Inventory & Media (5 cols) */}
          <div className="lg:col-span-5 space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            <div>
              <label className="block text-xs font-bold text-slate-555 uppercase mb-1">Product Main Image *</label>
              <div className="flex items-center gap-3">
                {formData.image ? (
                  <div className="relative w-full h-32 rounded-xl border border-slate-200 overflow-hidden group shadow-xxs">
                    <img src={getImageUrl(formData.image)} alt="Main Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '', imageFile: null })}
                        className="p-2 bg-rose-600 rounded-full text-white hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="w-full h-32 flex flex-col items-center justify-center border border-dashed border-slate-300 hover:border-brand-orange bg-slate-50 hover:bg-slate-100/50 rounded-xl cursor-pointer transition-colors shadow-xxs">
                    <Plus className="w-6 h-6 text-slate-400" />
                    <span className="text-xs text-slate-600 mt-1.5 font-bold">Click to upload product image</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, JPEG</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          const localUrl = URL.createObjectURL(file);
                          setFormData({ ...formData, image: localUrl, imageFile: file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Base MRP (₹) *</label>
                <input 
                  type="number" 
                  placeholder="2999" 
                  value={formData.mrp} 
                  onChange={(e) => setFormData({...formData, mrp: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Cost Price (₹) *</label>
                <input 
                  type="number" 
                  placeholder="1200" 
                  value={formData.costPrice} 
                  onChange={(e) => setFormData({...formData, costPrice: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Article No. *</label>
                <input 
                  type="text" 
                  placeholder="ART-AC-01" 
                  value={formData.article_no} 
                  disabled={!!editingProd}
                  onChange={(e) => setFormData({...formData, article_no: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 disabled:bg-slate-100 disabled:text-slate-400" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">HSN Code *</label>
                <input 
                  type="text" 
                  placeholder="6403.99.90" 
                  value={formData.hsn_code} 
                  onChange={(e) => setFormData({...formData, hsn_code: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Franchise Points *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="10.0" 
                  value={formData.franchise_points} 
                  onChange={(e) => setFormData({...formData, franchise_points: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Color Label</label>
                <input 
                  type="text" 
                  placeholder="Red / Black" 
                  value={formData.colour} 
                  onChange={(e) => setFormData({...formData, colour: e.target.value})} 
                  className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-1.5 h-3 bg-brand-orange rounded-full"></span>
                Commission & Incentive Points
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Retailer (%)</label>
                  <input 
                    type="number" 
                    placeholder="20" 
                    value={formData.retailerMargin} 
                    onChange={(e) => setFormData({...formData, retailerMargin: e.target.value})} 
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">City Mgr (%)</label>
                  <input 
                    type="number" 
                    placeholder="2" 
                    value={formData.cityManagerIncentive} 
                    onChange={(e) => setFormData({...formData, cityManagerIncentive: e.target.value})} 
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">State Mgr (%)</label>
                  <input 
                    type="number" 
                    placeholder="1" 
                    value={formData.stateManagerIncentive} 
                    onChange={(e) => setFormData({...formData, stateManagerIncentive: e.target.value})} 
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 bg-white" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Product Description</label>
              <textarea 
                rows="3" 
                placeholder="Describe product details, synthetic meshes, outsoles..." 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/20" 
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Bulk Price Update Modal */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Catalogue Price Adjustment"
        onConfirm={handleBulkPriceUpdate}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
            <span className="font-bold">⚠️ Warning:</span>
            <p>This alters the base MRP and Franchise Cost price indices for all footwear models in the current system. This process is irreversible.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Percentage Mark Up / Mark Down (%)</label>
            <input 
              type="number" 
              placeholder="e.g., 5 or -2" 
              value={bulkAdjustment.value}
              onChange={(e) => setBulkAdjustment({ ...bulkAdjustment, value: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Positive numbers increase catalog base prices; negative numbers decrease pricing.</span>
          </div>
        </div>
      </Modal>

      {/* Detailed Product modal drawer */}
      {viewingProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <img src={getImageUrl(viewingProd.image)} alt={viewingProd.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">{viewingProd.name}</h3>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">{viewingProd.category} • MRP: ₹{viewingProd.mrp}</span>
                </div>
              </div>
              <button onClick={() => setViewingProd(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/30 px-6">
              {['overview', 'matrix', 'commissions'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setProdTab(tab)}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors uppercase ${prodTab === tab ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Profile Drawer contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {prodTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Product Description</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">{viewingProd.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Franchise Cost Price</span>
                      <p className="text-base font-bold text-slate-800 font-display mt-0.5">₹{viewingProd.costPrice}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Gross Margin</span>
                      <p className="text-base font-bold text-emerald-600 font-display mt-0.5">{viewingProd.margin}%</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Size Count</span>
                      <p className="text-base font-bold text-slate-800 font-display mt-0.5">{viewingProd.sizes.length} Sizes</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Article Number</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingProd.article_no || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">HSN Code</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingProd.hsn_code || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Colour</span>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">{viewingProd.colour || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Franchise Points</span>
                      <p className="text-sm font-bold text-indigo-600 mt-0.5">{viewingProd.franchise_points || 0} pts</p>
                    </div>
                  </div>
                </div>
              )}

              {prodTab === 'matrix' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Size × Color × Stock Variant Matrix</h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Size Mapping</th>
                          <th className="px-4 py-2.5">Color Tag & Variant SKU</th>
                          <th className="px-4 py-2.5 text-right">Warehouse Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingProd.variants && viewingProd.variants.length > 0 ? (
                          viewingProd.variants.map((v, i) => (
                            <tr key={v._id || i}>
                              <td className="px-4 py-2.5 text-slate-800 font-bold">UK {v.size}</td>
                              <td className="px-4 py-2.5 flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200 inline-block" style={{ backgroundColor: v.color }}></span>
                                <span className="font-mono text-[10px] text-slate-500">{v.sku_variant}</span>
                                {v.images && v.images.length > 0 && (
                                  <img src={getImageUrl(v.images[0])} alt="variant" className="w-6 h-6 object-cover rounded border border-slate-200 ml-auto" />
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-650">{v.stock_quantity} pairs</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="3" className="px-4 py-6 text-center text-slate-400">No variants generated for this product.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {prodTab === 'commissions' && (
                <CommissionForm 
                  product={viewingProd} 
                  onSave={(retM, cityM, stateM) => {
                    handleSaveCommissions(viewingProd.id, retM, cityM, stateM);
                    setViewingProd(null);
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inner helper component to manage local state for commission points safely
function CommissionForm({ product, onSave }) {
  const [retMargin, setRetMargin] = useState(product.retailerMargin || 20);
  const [cityIncentive, setCityIncentive] = useState(product.cityManagerIncentive || 2);
  const [stateIncentive, setStateIncentive] = useState(product.stateManagerIncentive || 1);

  return (
    <div className="space-y-4 text-xs font-semibold text-slate-700">
      <h4 className="text-xs font-bold text-slate-500 uppercase">Commission & Incentive Points Distribution</h4>
      <div className="space-y-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retailer Base Margin (%)</label>
          <input 
            type="number" 
            value={retMargin} 
            onChange={(e) => setRetMargin(e.target.value)} 
            className="border border-slate-200 p-2 rounded w-full bg-white font-bold" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">City Manager Incentive (%)</label>
          <input 
            type="number" 
            value={cityIncentive} 
            onChange={(e) => setCityIncentive(e.target.value)} 
            className="border border-slate-200 p-2 rounded w-full bg-white font-bold" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">State Manager Incentive (%)</label>
          <input 
            type="number" 
            value={stateIncentive} 
            onChange={(e) => setStateIncentive(e.target.value)} 
            className="border border-slate-200 p-2 rounded w-full bg-white font-bold" 
          />
        </div>
      </div>
      <button 
        type="button" 
        onClick={() => onSave(retMargin, cityIncentive, stateIncentive)} 
        className="w-full py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold rounded-lg shadow-sm transition-colors text-center"
      >
        Save Commission Settings
      </button>
    </div>
  );
}
