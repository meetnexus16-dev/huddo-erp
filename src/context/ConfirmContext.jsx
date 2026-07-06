import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal } from '../components/Common';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const closeDialog = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({
        mode: 'confirm',
        title: options.title || 'Confirm',
        message: options.message || 'Are you sure you want to continue?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        isDestructive: !!options.isDestructive
      });
    });
  }, []);

  const alert = useCallback((message, title = 'Notice') => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve(true);
      setState({
        mode: 'alert',
        title,
        message: message || '',
        confirmText: 'OK',
        cancelText: null,
        isDestructive: false
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {state && (
        <Modal
          isOpen
          onClose={() => closeDialog(false)}
          onConfirm={() => closeDialog(true)}
          title={state.title}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          isDestructive={state.isDestructive}
          hideCancel={state.mode === 'alert'}
          maxWidth="max-w-md"
        >
          {typeof state.message === 'string' ? (
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{state.message}</p>
          ) : (
            state.message
          )}
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
