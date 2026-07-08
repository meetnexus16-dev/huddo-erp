import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function CustomModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onConfirm, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isDestructive = false,
  hideFooter = false,
  size = "md" // md | lg | xl
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className={`bg-white w-full ${sizeClasses[size]} rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]`}>
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900 font-display">{title}</h3>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Modal Actions Footer */}
        {!hideFooter && (
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-white transition-colors"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button 
              onClick={onConfirm}
              className={`px-3.5 py-1.5 text-xs font-bold text-white rounded-lg transition-colors shadow-sm ${
                isDestructive 
                  ? 'bg-rose-600 hover:bg-rose-750' 
                  : 'bg-brand-orange hover:bg-brand-orange-hover'
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
