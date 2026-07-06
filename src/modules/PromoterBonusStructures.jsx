import React, { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';
import { useConfirm } from '../context/ConfirmContext';

const PROMOTED_ROLES = [
  { value: 'Retailer', label: 'Retailer' },
  { value: 'CityManager', label: 'City Manager' },
  { value: 'StateManager', label: 'State Manager' },
  { value: 'CountryManager', label: 'Country Manager' }
];

export default function PromoterBonusStructures({ showToast }) {
  const { confirm } = useConfirm();
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    promoted_role: 'Retailer',
    product_category: '',
    extra_bonus_percentage: 0,
    description: ''
  });
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    Promise.all([
      fetch('/api/promoter-bonus-structures').then((r) => r.json()),
      fetch('/api/product-categories').then((r) => r.json())
    ]).then(([bonusRes, catRes]) => {
      if (bonusRes.success) setRows(bonusRes.data || []);
      if (catRes.success) setCategories(catRes.data || []);
    });
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ promoted_role: 'Retailer', product_category: '', extra_bonus_percentage: 0, description: '' });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row._id);
    setForm({
      promoted_role: row.promoted_role,
      product_category: row.product_category?._id || '',
      extra_bonus_percentage: row.extra_bonus_percentage || 0,
      description: row.description || ''
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const res = await fetch('/api/promoter-bonus-structures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        promoted_role: form.promoted_role,
        product_category: form.product_category || null,
        extra_bonus_percentage: Number(form.extra_bonus_percentage),
        description: form.description
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast?.('Referrer bonus structure saved.', 'success');
      setModalOpen(false);
      load();
    } else {
      showToast?.(data.message || 'Save failed.', 'error');
    }
  };

  const handleDelete = async (row) => {
    if (!(await confirm({
      title: 'Delete bonus structure?',
      message: 'Delete this bonus structure?',
      confirmText: 'Delete',
      isDestructive: true
    }))) return;
    const res = await fetch(`/api/promoter-bonus-structures/${row._id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast?.('Deleted.', 'success');
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Global Referrer Commission Fallbacks</h3>
          <p className="text-sm text-slate-500">Used only when a category does not define referrer rates for a promoted role. Category-level rates always take priority.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold">
          <Plus size={16} /> Add Structure
        </button>
      </div>

      <DataTable
        data={rows}
        columns={[
          { header: 'Promoted Role', accessor: 'promoted_role' },
          { header: 'Category', accessor: (r) => r.product_category?.name || 'All Categories' },
          { header: 'Commission %', accessor: (r) => `${r.extra_bonus_percentage}%` },
          { header: 'Description', accessor: 'description' },
          {
            header: 'Actions',
            accessor: '_id',
            render: (_, row) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(row)} className="text-xs font-bold text-orange-600">Edit</button>
                <button onClick={() => handleDelete(row)} className="text-xs font-bold text-rose-600">Delete</button>
              </div>
            )
          }
        ]}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Bonus Structure' : 'Add Bonus Structure'}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">Promoted Role</label>
            <select value={form.promoted_role} onChange={(e) => setForm({ ...form, promoted_role: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {PROMOTED_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Product Category (optional)</label>
            <select value={form.product_category} onChange={(e) => setForm({ ...form, product_category: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Referrer Commission % (global fallback)</label>
            <input type="number" min="0" step="0.1" value={form.extra_bonus_percentage} onChange={(e) => setForm({ ...form, extra_bonus_percentage: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <button onClick={handleSave} className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
            <Save size={16} /> Save
          </button>
        </div>
      </Modal>
    </div>
  );
}
