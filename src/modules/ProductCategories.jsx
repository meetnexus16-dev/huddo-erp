import React, { useEffect, useState } from 'react';
import { Layers, Plus, Edit2, Trash2, Percent } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';

const EMPTY_FORM = {
  name: '',
  code: '',
  description: '',
  is_active: true,
  retailer: 20,
  cityManager: 2,
  stateManager: 1,
  countryManager: 0.5,
  promoter: 5
};

const COMMISSION_FIELDS = [
  { key: 'retailer', label: 'Retailer Margin', color: 'text-orange-600' },
  { key: 'cityManager', label: 'City Manager', color: 'text-blue-600' },
  { key: 'stateManager', label: 'State Manager', color: 'text-emerald-600' },
  { key: 'countryManager', label: 'Country Manager', color: 'text-amber-600' },
  { key: 'promoter', label: 'Promoter Royalty', color: 'text-purple-600' }
];

export default function ProductCategories({ showToast }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadCategories = () => {
    setLoading(true);
    fetch('/api/product-categories')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success && Array.isArray(resData.data)) {
          setCategories(resData.data);
        }
      })
      .catch((err) => console.error('Error loading categories:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const commissions = row.commissions || {};
    setEditingId(row._id);
    setFormData({
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      is_active: row.is_active !== false,
      retailer: commissions.retailer ?? 20,
      cityManager: commissions.cityManager ?? 2,
      stateManager: commissions.stateManager ?? 1,
      countryManager: commissions.countryManager ?? 0.5,
      promoter: commissions.promoter ?? 5
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showToast('Category name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        description: formData.description.trim(),
        is_active: formData.is_active,
        commissions: {
          retailer: Number(formData.retailer),
          cityManager: Number(formData.cityManager),
          stateManager: Number(formData.stateManager),
          countryManager: Number(formData.countryManager),
          promoter: Number(formData.promoter)
        }
      };

      const res = await fetch(
        editingId ? `/api/product-categories/${editingId}` : '/api/product-categories',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to save category.', 'error');
        return;
      }

      showToast(
        data.message || (editingId ? 'Category updated.' : 'Category created.'),
        'success'
      );
      setModalOpen(false);
      loadCategories();
    } catch (err) {
      showToast('Failed to save category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete category "${row.name}"?`)) return;

    try {
      const res = await fetch(`/api/product-categories/${row._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.message || 'Failed to delete category.', 'error');
        return;
      }
      showToast('Category deleted successfully.', 'success');
      loadCategories();
    } catch (err) {
      showToast('Failed to delete category.', 'error');
    }
  };

  const columns = [
    {
      header: 'Category',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 font-display">{val}</span>
          {row.code && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{row.code}</p>}
        </div>
      )
    },
    { header: 'Products', accessor: 'product_count', render: (val) => <span className="font-semibold">{val || 0}</span> },
    ...COMMISSION_FIELDS.map(({ key, label, color }) => ({
      header: label,
      accessor: 'commissions',
      render: (val) => (
        <span className={`font-bold ${color}`}>{val?.[key] ?? '—'}%</span>
      )
    })),
    {
      header: 'Status',
      accessor: 'is_active',
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${val ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {val ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: '_id',
      sortable: false,
      render: (val, row) => (
        <div className="flex gap-2">
          <button onClick={() => openEdit(row)} className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button onClick={() => handleDelete(row)} className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Product Categories</h1>
          <p className="text-sm text-slate-500">
            Maintain category master data and commission rates. All products in a category inherit these commissions automatically.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Percent className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <p className="font-bold uppercase tracking-wide mb-1">Category-level commissions</p>
          <p>
            Set retailer margin, city manager, state manager, country manager, and promoter royalty once per category.
            Every product assigned to that category uses these rates — you do not need to configure commission on each product.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-400 font-semibold">
          Loading categories...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          searchKeys={['name', 'code', 'description']}
          searchPlaceholder="Search categories..."
          emptyStateText="No product categories yet. Add your first category to start assigning products."
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId ? 'Edit Product Category' : 'Add Product Category'}
        onConfirm={handleSubmit}
        confirmText={saving ? 'Saving...' : 'Save Category'}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
                placeholder="e.g. Sports Shoes"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white font-mono"
                placeholder="e.g. SPT"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
              placeholder="Optional description for this category"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-brand-orange" />
              Commission Structure (%)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COMMISSION_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white font-semibold"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-sm font-semibold text-slate-700">Active Category</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${formData.is_active ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
