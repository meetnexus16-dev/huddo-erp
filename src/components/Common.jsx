import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Download, Eye, Edit2, AlertCircle, X, CheckCircle, KeyRound } from 'lucide-react';
import { DEFAULT_PASSWORD_LABEL } from '../constants/defaultCredentials';

export function DefaultPasswordNotice({ className = '', suffix = '' }) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50/80 px-3.5 py-3 ${className}`}>
      <div className="flex items-start gap-2.5">
        <KeyRound className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">Login account</p>
          <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
            A system login is created automatically. <span className="font-semibold">{DEFAULT_PASSWORD_LABEL}</span>.
            {suffix ? ` ${suffix}` : ' The user signs in with their email and should change the password from My Profile after first login.'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Custom Success/Error Toast notification component
export function Toast({ message, type = 'success', onClose }) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-bounce ${
      type === 'success' 
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
        : 'bg-rose-50 text-rose-800 border-rose-200'
    }`}>
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5 text-emerald-600" />
      ) : (
        <AlertCircle className="w-5 h-5 text-rose-600" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-slate-200/50 rounded transition-colors">
        <X className="w-4 h-4 text-slate-500" />
      </button>
    </div>
  );
}

// Interactive Data Table Component
export function DataTable({ 
  columns, 
  data, 
  searchPlaceholder = "Search records...", 
  searchKeys = [], // array of fields to search across
  onRowClick,
  actionButton,
  emptyStateText = "No items found",
  emptyStateAction,
  emptyStateActionText
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (!data.length) return;
    const headerRow = columns.map(col => col.header).join(',');
    const rows = data.map(item => 
      columns.map(col => {
        let val = typeof col.accessor === 'function' ? col.accessor(item) : item[col.accessor];
        if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`;
        return val ?? '';
      }).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `huddo_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process data (filter + sort + paginate)
  const processedData = useMemo(() => {
    let result = [...data];

    // Filter
    if (searchTerm && searchKeys.length > 0) {
      result = result.filter(item => 
        searchKeys.some(key => {
          const val = typeof key === 'function' ? key(item) : item[key];
          return val?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        // Handle nested accessors
        const col = columns.find(c => c.accessor === sortConfig.key);
        if (col && typeof col.accessor === 'function') {
          valA = col.accessor(a);
          valB = col.accessor(b);
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        const strA = valA.toString().toLowerCase();
        const strB = valB.toString().toLowerCase();

        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, searchKeys, sortConfig, columns]);

  // Pagination bounds
  const totalPages = Math.ceil(processedData.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white"
          />
        </div>
        
        <div className="flex w-full sm:w-auto gap-3 items-center justify-end">
          {actionButton}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col, index) => (
                <th 
                  key={index}
                  onClick={() => col.sortable !== false && handleSort(col.accessor)}
                  className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && sortConfig.key === col.accessor && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, colIndex) => {
                    const cellVal = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
                    return (
                      <td key={colIndex} className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {col.render ? col.render(cellVal, row) : cellVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                    <p className="text-slate-500 text-sm font-medium">{emptyStateText}</p>
                    {emptyStateAction && (
                      <button 
                        onClick={emptyStateAction}
                        className="mt-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                      >
                        {emptyStateActionText || "Add Item"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {processedData.length > 0 && (
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Show</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
            <span className="ml-4">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, processedData.length)} of {processedData.length} entries
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-sm rounded-md disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-medium transition-colors"
            >
              Previous
            </button>
            {(() => {
              const maxVisible = 5;
              const pages = [];
              if (totalPages <= maxVisible) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                const half = Math.floor(maxVisible / 2);
                let start = currentPage - half;
                let end = currentPage + half;
                if (start <= 1) {
                  start = 1;
                  end = maxVisible;
                } else if (end >= totalPages) {
                  end = totalPages;
                  start = totalPages - maxVisible + 1;
                }
                for (let i = start; i <= end; i++) pages.push(i);
              }
              return (
                <>
                  {pages[0] > 1 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className="w-8 h-8 flex items-center justify-center text-sm rounded-md font-semibold hover:bg-slate-100 text-slate-650 cursor-pointer"
                      >
                        1
                      </button>
                      {pages[0] > 2 && <span className="px-1 text-slate-400 text-xs font-bold select-none">...</span>}
                    </>
                  )}
                  {pages.map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 flex items-center justify-center text-sm rounded-md font-semibold transition-colors cursor-pointer ${
                        currentPage === p 
                          ? 'bg-brand-orange text-white' 
                          : 'border border-transparent hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {pages[pages.length - 1] < totalPages && (
                    <>
                      {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-slate-400 text-xs font-bold select-none">...</span>}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="w-8 h-8 flex items-center justify-center text-sm rounded-md font-semibold hover:bg-slate-100 text-slate-650 cursor-pointer"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </>
              );
            })()}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-200 hover:bg-slate-100 text-sm rounded-md disabled:opacity-50 disabled:hover:bg-white text-slate-600 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal component with ESC, overlay-click, and confirmation validations
export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onConfirm, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isDestructive = false,
  maxWidth = "max-w-lg"
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className={`bg-white w-full ${maxWidth} rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-900 font-display">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white transition-colors"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button 
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${
                isDestructive 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-brand-orange hover:bg-brand-orange-hover'
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton loading loader widget
export function SkeletonLoader({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-6"></div>
      <div className="space-y-3">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="flex gap-4">
            {[...Array(cols)].map((_, c) => (
              <div key={c} className="h-5 bg-slate-100 rounded-md flex-1"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
