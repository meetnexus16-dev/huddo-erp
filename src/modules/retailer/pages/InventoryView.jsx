import React, { useState, useEffect } from 'react';
import { Search, Archive, AlertCircle, RefreshCw, Package, Eye, Boxes } from 'lucide-react';
import { useRetailerAuth } from '../context/RetailerAuthContext';
import CustomModal from '../components/CustomModal';

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
  if (!color) return '—';
  return COLOR_NAME_MAP[String(color).toUpperCase()] || color;
};

const sortSizes = (a, b) => {
  const na = parseFloat(a), nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
};

export default function InventoryView() {
  const { user } = useRetailerAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch('/api/retailer/stock')
      .then((res) => res.json())
      .then((res) => {
        if (!res.success || !Array.isArray(res.data)) {
          setProducts([]);
          setMeta(null);
          return;
        }
        setMeta(res.meta || null);

        const map = {};
        res.data.forEach((row) => {
          const pid = String(row.product_id);
          if (!map[pid]) {
            map[pid] = {
              id: pid,
              name: row.product_name || 'Footwear',
              category: row.category || 'Footwear',
              total: 0,
              purchased: 0,
              sold: 0,
              variantMap: {}
            };
          }
          const key = `${row.size}||${row.color}`;
          if (!map[pid].variantMap[key]) {
            map[pid].variantMap[key] = {
              size: row.size,
              color: row.color,
              qty: 0,
              purchased: 0,
              sold: 0,
              sku: row.sku_variant
            };
          }
          map[pid].variantMap[key].qty += Number(row.available_qty) || 0;
          map[pid].variantMap[key].purchased += Number(row.purchased_qty) || 0;
          map[pid].variantMap[key].sold += Number(row.sold_qty) || 0;
          map[pid].total += Number(row.available_qty) || 0;
          map[pid].purchased += Number(row.purchased_qty) || 0;
          map[pid].sold += Number(row.sold_qty) || 0;
        });

        const list = Object.values(map)
          .map((p) => {
            const variantList = Object.values(p.variantMap);
            const sizes = [...new Set(variantList.filter((v) => v.qty > 0).map((v) => v.size))].sort(sortSizes);
            return {
              id: p.id,
              name: p.name,
              category: p.category,
              total: p.total,
              purchased: p.purchased,
              sold: p.sold,
              sizes,
              variantList: variantList.sort(
                (a, b) => sortSizes(a.size, b.size) || getColorName(a.color).localeCompare(getColorName(b.color))
              )
            };
          })
          .filter((p) => p.purchased > 0 || p.total > 0);

        setProducts(list);
      })
      .catch((err) => {
        console.error('Error loading retailer stock:', err);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4 min-h-[400px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold font-display">
          <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
          <span>Loading your inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-display">My Inventory Stock</h1>
        <p className="text-xs text-slate-550 font-medium font-sans">
          Available stock = purchased (approved orders) − sold (retail sales). Click a product for size-wise detail.
        </p>
      </div>

      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">SKUs in stock</span>
            <p className="text-lg font-extrabold text-slate-850">{meta.total_skus || 0}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Available pairs</span>
            <p className="text-lg font-extrabold text-brand-orange">{meta.total_available_pairs || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search your products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white font-medium text-slate-705"
          />
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-650">
        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
        <p className="font-semibold text-slate-600">
          <span className="font-bold text-slate-800">Notice:</span> Selling via Create Sale reduces available quantity here automatically.
        </p>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => setSelectedProduct(product)}
              className="text-left bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md hover:border-brand-orange/40 transition-all cursor-pointer flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center shrink-0">
                    <Package className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 font-display line-clamp-1">{product.name}</h3>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">{product.category}</span>
                  </div>
                </div>
                <Eye className="w-4 h-4 text-slate-300 shrink-0" />
              </div>

              <div className="flex items-end justify-between gap-2">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Available</span>
                  <p className="text-lg font-extrabold text-slate-850 font-display">
                    {product.total} <span className="text-xs font-bold text-slate-400">pairs</span>
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-semibold">
                  <div>Bought {product.purchased}</div>
                  <div>Sold {product.sold}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Sizes Available</span>
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.length > 0 ? (
                    product.sizes.map((sz) => (
                      <span key={sz} className="px-2 py-0.5 text-[10px] font-bold border border-slate-200 text-slate-600 rounded-md bg-slate-50">
                        {sz}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">All sold out</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Archive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-550 text-xs font-semibold">You have no purchased stock yet. Approved orders will appear here.</p>
        </div>
      )}

      {selectedProduct && (
        <CustomModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title={`Size-wise Inventory · ${selectedProduct.name}`}
          size="lg"
          hideFooter
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-xs">
                <Boxes className="w-4 h-4 text-brand-orange" />
                <span className="font-semibold text-slate-600 uppercase">{selectedProduct.category}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Available</span>
                <p className="text-sm font-extrabold text-slate-850">{selectedProduct.total} pairs</p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Size</th>
                    <th className="px-4 py-2.5">Color</th>
                    <th className="px-4 py-2.5 text-right">Bought</th>
                    <th className="px-4 py-2.5 text-right">Sold</th>
                    <th className="px-4 py-2.5 text-right">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedProduct.variantList.map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="px-4 py-2.5 font-bold text-slate-900">S-{v.size}</td>
                      <td className="px-4 py-2.5 text-slate-600">{getColorName(v.color)}</td>
                      <td className="px-4 py-2.5 text-right">{v.purchased}</td>
                      <td className="px-4 py-2.5 text-right">{v.sold}</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-slate-850">{v.qty}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td colSpan="4" className="px-4 py-3 text-right">Total available</td>
                    <td className="px-4 py-3 text-right text-brand-orange">{selectedProduct.total} pairs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
